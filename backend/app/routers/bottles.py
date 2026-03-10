import logging
import os
import shutil
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import get_current_user
from app.database import get_session
from app.models import Bottle, BottleUpdate, PlaceBottle, Slot
from app.services.gemini import analyze_label

router = APIRouter(
    prefix="/api/bottles",
    tags=["bottles"],
    dependencies=[Depends(get_current_user)],
)

DATA_DIR = os.environ.get("DATA_DIR", "/data")
UPLOADS_DIR = Path(f"{DATA_DIR}/uploads/bottles")


@router.get("", response_model=List[Bottle])
async def list_bottles(session: AsyncSession = Depends(get_session)):
    """Returns active bottles (excludes consommé/offerte — use /history for those)."""
    result = await session.exec(
        select(Bottle).where(Bottle.statut != "consommé/offerte")
    )
    return result.all()


@router.get("/history", response_model=List[Bottle])
async def list_bottles_history(session: AsyncSession = Depends(get_session)):
    """Returns consumed or gifted bottles."""
    result = await session.exec(
        select(Bottle).where(Bottle.statut == "consommé/offerte")
    )
    return result.all()


@router.post("/upload", response_model=Bottle)
async def upload_bottle(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    bottle = Bottle()
    session.add(bottle)
    await session.commit()
    await session.refresh(bottle)

    suffix = Path(file.filename).suffix
    filename = f"bottle_{bottle.id}{suffix}"
    dest = UPLOADS_DIR / filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    bottle.photo_path = f"/uploads/bottles/{filename}"
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

    # If marked as consommé/offerte, remove from slot automatically
    if update_data.get("statut") == "consommé/offerte" and bottle.slot_id is not None:
        bottle.slot_id = None

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

    if bottle.photo_path:
        photo_file = Path(f"{DATA_DIR}{bottle.photo_path}")
        if photo_file.exists():
            photo_file.unlink()

    await session.delete(bottle)
    await session.commit()
    return {"ok": True}


@router.post("/{bottle_id}/analyze", response_model=Bottle)
async def analyze_bottle(
    bottle_id: int,
    session: AsyncSession = Depends(get_session),
):
    bottle = await session.get(Bottle, bottle_id)
    if not bottle:
        raise HTTPException(status_code=404, detail="Bottle not found")
    if not bottle.photo_path:
        raise HTTPException(status_code=400, detail="Aucune photo à analyser")

    full_path = f"{DATA_DIR}{bottle.photo_path}"

    try:
        data = await analyze_label(full_path)
    except EnvironmentError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("Gemini analysis failed: %s", e)
        raise HTTPException(status_code=500, detail="Erreur lors de l'analyse — réessayez")

    # Apply extracted fields (never overwrite with null)
    if data.get("domaine"):
        bottle.domaine = data["domaine"]
    if data.get("appellation"):
        bottle.appellation = data["appellation"]
    if data.get("millesime"):
        try:
            bottle.millesime = int(data["millesime"])
        except (ValueError, TypeError):
            pass
    if data.get("taille"):
        bottle.taille = data["taille"]
    if data.get("cepage"):
        bottle.cepage = data["cepage"]

    session.add(bottle)
    await session.commit()
    await session.refresh(bottle)
    return bottle


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

    existing = await session.exec(
        select(Bottle).where(Bottle.slot_id == data.slot_id, Bottle.id != bottle_id)
    )
    if existing.first():
        raise HTTPException(status_code=409, detail="Slot already occupied")

    bottle.slot_id = data.slot_id
    bottle.statut = "en cave"
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
    if bottle.statut == "en cave":
        bottle.statut = "à ranger"
    session.add(bottle)
    await session.commit()
    await session.refresh(bottle)
    return bottle
