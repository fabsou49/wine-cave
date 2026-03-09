import asyncio
import io
import json
import os
import re
from pathlib import Path

import ollama as ollama_sdk
from PIL import Image


OCR_MODEL = "llama3.2-vision"
ANALYSIS_MODEL = "llama3.2:3b"

# Ollama ne supporte qu'une requête à la fois — on sérialise
_ollama_semaphore = asyncio.Semaphore(1)


def _get_host() -> str:
    env_host = os.environ.get("OLLAMA_HOST", "")
    if env_host:
        return env_host
    data_dir = os.environ.get("DATA_DIR", "/data")
    settings_file = Path(data_dir) / "settings.json"
    if settings_file.exists():
        try:
            data = json.loads(settings_file.read_text())
            return data.get("ollama_host", "")
        except Exception:
            pass
    return "http://localhost:11434"


def _get_client():
    return ollama_sdk.Client(host=_get_host())


def _extract_json(text: str) -> str:
    """Extrait le premier objet JSON trouvé dans le texte."""
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
    if fenced:
        return fenced.group(1)
    match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
    if match:
        return match.group(0)
    return text.strip()


def _resize_image(image_path: str, max_size: int = 1120) -> bytes:
    """Redimensionne l'image à max_size px max et retourne les bytes JPEG."""
    from PIL import ImageOps
    img = Image.open(image_path)
    img = ImageOps.exif_transpose(img)  # Corrige l'orientation EXIF (photos PC/Android)
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _ocr_sync(image_path: str) -> dict:
    """Utilise generate (stateless) pour éviter tout contexte entre les appels."""
    client = _get_client()
    image_data = _resize_image(image_path)
    prompt = (
        "You are a wine label OCR expert. Read ONLY what is literally written on this label image. "
        "Do NOT use any prior knowledge or previous results. "
        "Do NOT guess or invent information. "
        "Return ONLY a JSON object with these exact fields (null if not visible):\n"
        '{"domaine": string|null, "cepage": string|null, "appellation": string|null, '
        '"millesime": integer|null, "taille": string|null}\n'
        "millesime must be a 4-digit year integer (e.g. 2019), or null.\n"
        "Return ONLY the raw JSON object, no markdown, no explanation, no extra text."
    )
    # generate est complètement stateless — pas de contexte entre les appels
    response = client.generate(
        model=OCR_MODEL,
        prompt=prompt,
        images=[image_data],
        options={"temperature": 0.1, "seed": 0},
    )
    raw = response.response
    print(f"[OCR] Raw: {raw!r}", flush=True)
    try:
        data = json.loads(_extract_json(raw))
        if data.get("millesime") and not isinstance(data["millesime"], int):
            try:
                data["millesime"] = int(str(data["millesime"]))
            except (ValueError, TypeError):
                data["millesime"] = None
        return data
    except json.JSONDecodeError as e:
        print(f"[OCR] JSON error: {e}", flush=True)
        return {}


def _analyze_sync(bottle_info: dict, web_context: str = "") -> dict:
    client = _get_client()
    context_block = (
        f"\nInformations complémentaires trouvées sur internet:\n{web_context}\n"
        if web_context else ""
    )
    prompt = (
        "Tu es un expert sommelier. Analyse ce vin et retourne UNIQUEMENT un objet JSON avec ces champs:\n"
        '{"type_vin": string, "apogee_debut": integer|null, "apogee_fin": integer|null, '
        '"accord": string, "annee_degustation": integer|null, "description": string}\n'
        "- type_vin : rouge / blanc / rosé / effervescent / liquoreux / autre\n"
        "- apogee_debut / apogee_fin : années de la fenêtre d'apogée\n"
        "- accord : accords mets-vins détaillés\n"
        "- annee_degustation : année idéale pour ouvrir la bouteille (entier)\n"
        "- description : description du vin en 2-3 phrases (arômes, bouche, caractère)\n"
        f"Informations du vin: {json.dumps(bottle_info, ensure_ascii=False)}\n"
        f"{context_block}"
        "Retourne UNIQUEMENT le JSON, sans explication."
    )
    response = client.generate(
        model=ANALYSIS_MODEL,
        prompt=prompt,
        options={"temperature": 0.2, "seed": 0},
    )
    raw = response.response
    print(f"[ANALYZE] Raw: {raw!r}", flush=True)
    try:
        return json.loads(_extract_json(raw))
    except json.JSONDecodeError as e:
        print(f"[ANALYZE] JSON error: {e}", flush=True)
        return {}


async def ocr_label(image_path: str) -> dict:
    async with _ollama_semaphore:
        return await asyncio.to_thread(_ocr_sync, image_path)


async def analyze_wine(bottle_info: dict, web_context: str = "") -> dict:
    async with _ollama_semaphore:
        return await asyncio.to_thread(_analyze_sync, bottle_info, web_context)
