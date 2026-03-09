import asyncio
import json
import re
import os
from pathlib import Path

import google.generativeai as genai
from PIL import Image


def _get_api_key() -> str:
    """Env var takes priority, then settings.json file."""
    env_key = os.environ.get("GEMINI_API_KEY", "")
    if env_key:
        return env_key
    data_dir = os.environ.get("DATA_DIR", "/data")
    settings_file = Path(data_dir) / "settings.json"
    if settings_file.exists():
        try:
            data = json.loads(settings_file.read_text())
            return data.get("gemini_api_key", "")
        except Exception:
            pass
    return ""


def _configure():
    api_key = _get_api_key()
    if not api_key:
        raise ValueError("Clé API Gemini non configurée. Rendez-vous dans Paramètres.")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-3.1-flash")


def _strip_fences(text: str) -> str:
    text = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text.strip())
    return text.strip()


def _ocr_sync(image_path: str) -> dict:
    """Raises on API error, returns {} only on JSON parse failure."""
    model = _configure()
    img = Image.open(image_path)
    prompt = (
        "Tu es un expert en vins. Analyse cette étiquette de bouteille de vin et "
        "retourne UNIQUEMENT un objet JSON avec les champs suivants (null si non trouvé):\n"
        '{"domaine": string|null, "cepage": string|null, "appellation": string|null, '
        '"millesime": integer|null, "taille": string|null}\n'
        "Ne retourne aucun texte en dehors du JSON."
    )
    response = model.generate_content([prompt, img])
    try:
        return json.loads(_strip_fences(response.text))
    except json.JSONDecodeError:
        return {}


def _analyze_sync(bottle_info: dict) -> dict:
    """Raises on API error, returns {} only on JSON parse failure."""
    model = _configure()
    prompt = (
        "Tu es un expert en vins. Analyse ce vin et retourne UNIQUEMENT un objet JSON:\n"
        '{"type_vin": string, "apogee_debut": integer|null, "apogee_fin": integer|null, "accord": string}\n'
        f"Informations du vin: {json.dumps(bottle_info, ensure_ascii=False)}\n"
        "Ne retourne aucun texte en dehors du JSON."
    )
    response = model.generate_content(prompt)
    try:
        return json.loads(_strip_fences(response.text))
    except json.JSONDecodeError:
        return {}


async def ocr_label(image_path: str) -> dict:
    return await asyncio.to_thread(_ocr_sync, image_path)


async def analyze_wine(bottle_info: dict) -> dict:
    return await asyncio.to_thread(_analyze_sync, bottle_info)
