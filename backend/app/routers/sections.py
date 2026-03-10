import json
import os
import shutil
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import get_current_user
from app.database import get_session
from app.models import Section, SectionCreate, SectionUpdate, Slot

router = APIRouter(
    prefix="/api/sections",
    tags=["sections"],
    dependencies=[Depends(get_current_user)],
)

DATA_DIR = os.environ.get("DATA_DIR", "/data")
UPLOADS_DIR = Path(f"{DATA_DIR}/uploads/sections")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("", response_model=List[Section])
async def list_sections(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Section))
    return result.all()


@router.post("", response_model=Section)
async def create_section(data: SectionCreate, session: AsyncSession = Depends(get_session)):
    # Resolve per-row slot counts
    if data.row_cols:
        row_cols = data.row_cols
        rows = len(row_cols)
        cols = max(row_cols)
    else:
        rows = data.rows
        cols = data.cols
        row_cols = [cols] * rows

    section = Section(
        name=data.name,
        rows=rows,
        cols=cols,
        row_cols=json.dumps(row_cols),
    )
    session.add(section)
    await session.commit()
    await session.refresh(section)

    # Auto-create slots — variable width per row
    for row_idx, num_cols in enumerate(row_cols):
        for col_idx in range(num_cols):
            slot = Slot(section_id=section.id, row=row_idx, col=col_idx)
            session.add(slot)
    await session.commit()
    return section


@router.put("/{section_id}", response_model=Section)
async def update_section(
    section_id: int,
    data: SectionUpdate,
    session: AsyncSession = Depends(get_session),
):
    section = await session.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(section, key, value)

    session.add(section)
    await session.commit()
    await session.refresh(section)
    return section


@router.delete("/{section_id}")
async def delete_section(section_id: int, session: AsyncSession = Depends(get_session)):
    section = await session.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    slots = await session.exec(select(Slot).where(Slot.section_id == section_id))
    for slot in slots.all():
        await session.delete(slot)

    await session.delete(section)
    await session.commit()
    return {"ok": True}


@router.post("/{section_id}/photo", response_model=Section)
async def upload_section_photo(
    section_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    section = await session.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Validate extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Format non autorisé. Utilisez JPG, PNG, WEBP ou HEIC")

    # Validate MIME type
    content_type = (file.content_type or "").split(";")[0].strip()
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé")

    # Read and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 10 Mo)")

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOADS_DIR / f"section_{section_id}{suffix}"
    dest.write_bytes(content)

    section.photo_path = f"/uploads/sections/section_{section_id}{suffix}"
    session.add(section)
    await session.commit()
    await session.refresh(section)
    return section


@router.get("/{section_id}/slots")
async def list_slots(section_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Slot).where(Slot.section_id == section_id))
    return result.all()
