import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import init_db, migrate_db
from app.routers import sections, bottles, auth

DATA_DIR = os.environ.get("DATA_DIR", "/data")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await migrate_db()
    Path(f"{DATA_DIR}/uploads/bottles").mkdir(parents=True, exist_ok=True)
    Path(f"{DATA_DIR}/uploads/sections").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Cave à Vin API", lifespan=lifespan)

# API routes — MUST be registered before catch-all
app.include_router(auth.router)
app.include_router(sections.router)
app.include_router(bottles.router)

# Static uploads
uploads_path = Path(f"{DATA_DIR}/uploads")
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=f"{DATA_DIR}/uploads"), name="uploads")

# Serve React SPA static files
static_path = Path("/app/static")
if static_path.exists():
    app.mount("/assets", StaticFiles(directory="/app/static/assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return FileResponse("/app/static/index.html")
