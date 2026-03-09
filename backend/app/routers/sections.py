import os
import shutil
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models import Section, SectionCreate, SectionUpdate, Slot

router = APIRouter(prefix="/api/sections", tags=["sections"])

DATA_DIR = os.environ.get("DATA_DIR", "/data")
UPLOADS_DIR = Path(f"{DATA_DIR}/uploads/sections")


@router.get("", response_model=List[Section])
async def list_sections(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Section))
    return result.all()


@router.post("", response_model=Section)
async def create_section(data: SectionCreate, session: AsyncSession = Depends(get_session)):
    section = Section(**data.model_dump())
    session.add(section)
    await session.commit()
    await session.refresh(section)

    # Auto-create all slots
    for r in range(section.rows):
        for c in range(section.cols):
            slot = Slot(section_id=section.id, row=r, col=c)
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

    # Delete associated slots
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

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename).suffix
    dest = UPLOADS_DIR / f"section_{section_id}{suffix}"
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    section.photo_path = f"/uploads/sections/section_{section_id}{suffix}"
    session.add(section)
    await session.commit()
    await session.refresh(section)
    return section


@router.get("/{section_id}/slots")
async def list_slots(section_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Slot).where(Slot.section_id == section_id))
    return result.all()
