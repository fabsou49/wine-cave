import os
from sqlalchemy import text
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

DATA_DIR = os.environ.get("DATA_DIR", "/data")
DATABASE_URL = f"sqlite+aiosqlite:///{DATA_DIR}/cave.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def migrate_db():
    """Safely add new columns to existing tables without touching existing data.
    Uses PRAGMA table_info to check for columns before attempting ALTER TABLE.
    This is idempotent and safe to run on every startup."""
    async with engine.begin() as conn:
        result = await conn.execute(text("PRAGMA table_info(bottle)"))
        existing_cols = {row[1] for row in result.fetchall()}

        new_columns = [
            ("obtention_detail", "TEXT"),
            ("statut", "TEXT NOT NULL DEFAULT 'à ranger'"),
            ("commentaire_consommation", "TEXT"),
        ]

        for col_name, col_def in new_columns:
            if col_name not in existing_cols:
                await conn.execute(
                    text(f"ALTER TABLE bottle ADD COLUMN {col_name} {col_def}")
                )


async def get_session():
    async with AsyncSessionLocal() as session:
        yield session
