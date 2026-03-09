import json
import os
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/settings", tags=["settings"])

DATA_DIR = os.environ.get("DATA_DIR", "/data")
SETTINGS_FILE = Path(f"{DATA_DIR}/settings.json")


def _read() -> dict:
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text())
        except Exception:
            pass
    return {}


def _write(data: dict):
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(data, indent=2))


class SettingsPayload(BaseModel):
    ollama_host: str


class SettingsResponse(BaseModel):
    ollama_host: str
    has_env_host: bool  # hôte présent via variable d'env (prioritaire)


@router.get("", response_model=SettingsResponse)
def get_settings():
    data = _read()
    env_host = os.environ.get("OLLAMA_HOST", "")
    stored_host = data.get("ollama_host", "")
    return SettingsResponse(
        ollama_host=stored_host or env_host or "http://localhost:11434",
        has_env_host=bool(env_host),
    )


@router.post("", response_model=SettingsResponse)
def save_settings(payload: SettingsPayload):
    data = _read()
    data["ollama_host"] = payload.ollama_host
    _write(data)
    env_host = os.environ.get("OLLAMA_HOST", "")
    return SettingsResponse(
        ollama_host=payload.ollama_host,
        has_env_host=bool(env_host),
    )
