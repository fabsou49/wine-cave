from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, SQLModel


class Section(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    rows: int
    cols: int
    photo_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    column_rows: Optional[str] = None  # JSON array e.g. "[5,6,4,5]" — rows per column


class Slot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    section_id: int = Field(foreign_key="section.id")
    row: int
    col: int
    custom_label: Optional[str] = None


class Bottle(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    photo_path: Optional[str] = None
    domaine: Optional[str] = None
    cepage: Optional[str] = None
    appellation: Optional[str] = None
    millesime: Optional[int] = None
    taille: Optional[str] = None
    label_verified: bool = False
    slot_id: Optional[int] = Field(default=None, foreign_key="slot.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # New lifecycle fields
    obtention_detail: Optional[str] = None
    statut: str = Field(default="à ranger")  # "à ranger", "en cave", "consommé/offerte"
    commentaire_consommation: Optional[str] = None


# Pydantic schemas (non-table)
class SectionCreate(SQLModel):
    name: str
    rows: int
    cols: int
    column_rows: Optional[List[int]] = None  # per-column row counts; overrides rows/cols if set


class SectionUpdate(SQLModel):
    name: Optional[str] = None


class BottleUpdate(SQLModel):
    domaine: Optional[str] = None
    cepage: Optional[str] = None
    appellation: Optional[str] = None
    millesime: Optional[int] = None
    taille: Optional[str] = None
    label_verified: Optional[bool] = None
    obtention_detail: Optional[str] = None
    statut: Optional[str] = None
    commentaire_consommation: Optional[str] = None


class PlaceBottle(SQLModel):
    slot_id: int
