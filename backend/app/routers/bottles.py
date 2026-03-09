import logging
import os
import shutil
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models import Bottle, BottleUpdate, PlaceBottle, Slot
from app.services.ollama import ocr_label

router = APIRouter(prefix="/api/bottles", tags=["bottles"])

DATA_DIR = os.environ.get("DATA_DIR", "/data")
UPLOADS_DIR = Path(f"{DATA_DIR}/uploads/bottles")


@router.get("", response_model=List[Bottle])
async def list_bottles(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Bottle))
    return result.all()


@router.post("/upload", response_model=Bottle)
async def upload_bottle(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    # Save the uploaded file temporarily to get an id first
    bottle = Bottle()
    session.add(bottle)
    await session.commit()
    await session.refresh(bottle)

    suffix = Path(file.filename).suffix
    filename = f"bottle_{bottle.id}{suffix}"
    dest = UPLOADS_DIR / filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    photo_path = f"/uploads/bottles/{filename}"
    bottle.photo_path = photo_path

    # Run OCR via Ollama (non-blocking: save bottle even if OCR fails)
    try:
        print(f"[OCR] Starting OCR for {dest}", flush=True)
        ocr_data = await ocr_label(str(dest))
        print(f"[OCR] Result: {ocr_data}", flush=True)
    except Exception as e:
        import traceback
        print(f"[OCR] ERROR: {e}", flush=True)
        traceback.print_exc()
        ocr_data = {}
    if ocr_data:
        bottle.domaine = ocr_data.get("domaine")
        bottle.cepage = ocr_data.get("cepage")
        bottle.appellation = ocr_data.get("appellation")
        bottle.millesime = ocr_data.get("millesime")
        bottle.taille = ocr_data.get("taille")

    session.add(bottle)
    await session.commit()
    await session.refresh(bottle)
    return bottle


@router.put("/{bottle_id}", response_model=Bottle)
async def update_bottle(
    bottle_id: int,
    data: BottleUpdate,
    session: AsyncSession = Depends(get_session),
):
    bottle = await session.get(Bottle, bottle_id)
    if not bottle:
        raise HTTPException(status_code=404, detail="Bottle not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bottle, key, value)

    session.add(bottle)
    await session.commit()
    await session.refresh(bottle)
    return bottle


@router.delete("/{bottle_id}")
async def delete_bottle(bottle_id: int, session: AsyncSession = Depends(get_session)):
    bottle = await session.get(Bottle, bottle_id)
    if not bottle:
        raise HTTPException(status_code=404, detail="Bottle not found")

    # Delete photo file if exists
    if bottle.photo_path:
        photo_file = Path(f"{DATA_DIR}{bottle.photo_path}")
        if photo_file.exists():
            photo_file.unlink()

    await session.delete(bottle)
    await session.commit()
    return {"ok": True}


@router.post("/{bottle_id}/place", response_model=Bottle)
async def place_bottle(
    bottle_id: int,
    data: PlaceBottle,
    session: AsyncSession = Depends(get_session),
):
    bottle = await session.get(Bottle, bottle_id)
    if not bottle:
        raise HTTPException(status_code=404, detail="Bottle not found")

    slot = await session.get(Slot, data.slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    # Check if slot already occupied by another bottle
    existing = await session.exec(
        select(Bottle).where(Bottle.slot_id == data.slot_id, Bottle.id != bottle_id)
    )
    if existing.first():
        raise HTTPException(status_code=409, detail="Slot already occupied")

    bottle.slot_id = data.slot_id
    session.add(bottle)
    await session.commit()
    await session.refresh(bottle)
    return bottle


@router.delete("/{bottle_id}/place", response_model=Bottle)
async def remove_bottle_from_slot(
    bottle_id: int,
    session: AsyncSession = Depends(get_session),
):
    bottle = await session.get(Bottle, bottle_id)
    if not bottle:
        raise HTTPException(status_code=404, detail="Bottle not found")

    bottle.slot_id = None
    session.add(bottle)
    await session.commit()
    await session.refresh(bottle)
    return bottle
