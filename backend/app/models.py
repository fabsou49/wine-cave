from datetime import datetime
from typing import List, Optional
from pydantic import field_validator
from sqlmodel import Field, SQLModel


class Section(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    rows: int
    cols: int
    photo_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    column_rows: Optional[str] = None  # legacy — kept for backward compat
    row_cols: Optional[str] = None     # JSON array e.g. "[6,5,4,6]" — slots per row


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
    name: str = Field(max_length=200)
    rows: int = Field(ge=1, le=50)
    cols: int = Field(ge=1, le=50)
    row_cols: Optional[List[int]] = None  # slots per row; overrides rows/cols if set

    @field_validator("row_cols")
    @classmethod
    def validate_row_cols(cls, v):
        if v is not None:
            if len(v) > 50:
                raise ValueError("Trop de rangées (max 50)")
            if any(c < 1 or c > 50 for c in v):
                raise ValueError("Nombre d'emplacements invalide (1–50)")
        return v


class SectionUpdate(SQLModel):
    name: Optional[str] = Field(default=None, max_length=200)


_VALID_STATUTS = {"à ranger", "en cave", "consommé/offerte"}


class BottleUpdate(SQLModel):
    domaine: Optional[str] = Field(default=None, max_length=200)
    cepage: Optional[str] = Field(default=None, max_length=200)
    appellation: Optional[str] = Field(default=None, max_length=200)
    millesime: Optional[int] = None
    taille: Optional[str] = Field(default=None, max_length=50)
    label_verified: Optional[bool] = None
    obtention_detail: Optional[str] = Field(default=None, max_length=500)
    statut: Optional[str] = Field(default=None, max_length=50)
    commentaire_consommation: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("statut")
    @classmethod
    def validate_statut(cls, v):
        if v is not None and v not in _VALID_STATUTS:
            raise ValueError("Statut invalide")
        return v

    @field_validator("millesime")
    @classmethod
    def validate_millesime(cls, v):
        if v is not None and not (1800 <= v <= 2100):
            raise ValueError("Millésime invalide (1800–2100)")
        return v


class PlaceBottle(SQLModel):
    slot_id: int
