import asyncio
import json
import os
import re
from pathlib import Path
from typing import Optional

import google.generativeai as genai

MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

PROMPT = """Analyse cette étiquette de vin et retourne UNIQUEMENT un objet JSON avec exactement ces champs :
{
  "domaine": "nom complet du producteur / domaine / château (string ou null)",
  "appellation": "AOC, AOP, IGP ou appellation géographique (string ou null)",
  "millesime": annee_entiere_ou_null,
  "taille": "contenance ex: 75cl, 150cl (string ou null)",
  "cepage": "cépage(s) principaux si indiqués (string ou null)"
}
Ne retourne que le JSON brut, sans markdown, sans texte autour."""


def _get_model() -> genai.GenerativeModel:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY n'est pas configurée")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(MODEL_NAME)


def _infer_mime(path: str) -> str:
    ext = Path(path).suffix.lower()
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".heic": "image/heic",
    }.get(ext, "image/jpeg")


def _analyze_sync(image_path: str) -> dict:
    model = _get_model()

    with open(image_path, "rb") as f:
        image_data = f.read()

    try:
        response = model.generate_content([
            PROMPT,
            {"mime_type": _infer_mime(image_path), "data": image_data},
        ])
    except Exception as e:
        err = str(e).lower()
        if "quota" in err or "429" in err or "resource_exhausted" in err:
            raise RateLimitError("Quota Gemini atteint — réessayez dans une minute")
        raise

    text = response.text.strip()
    # Strip markdown fences if Gemini adds them
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    return json.loads(text)


class RateLimitError(Exception):
    pass


async def analyze_label(image_path: str) -> dict:
    """Analyze a bottle label image with Gemini. Returns extracted fields dict.
    Raises EnvironmentError if GEMINI_API_KEY is not set.
    Raises Exception on API or parsing errors."""
    return await asyncio.to_thread(_analyze_sync, image_path)
