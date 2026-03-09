from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models import Bottle
from app.services.ollama import analyze_wine
from app.services.web_search import search_wine_info

router = APIRouter(prefix="/api/bottles", tags=["analysis"])


@router.post("/{bottle_id}/analyze", response_model=Bottle)
async def analyze_bottle(bottle_id: int, session: AsyncSession = Depends(get_session)):
    bottle = await session.get(Bottle, bottle_id)
    if not bottle:
        raise HTTPException(status_code=404, detail="Bottle not found")

    bottle_info = {
        "domaine": bottle.domaine,
        "cepage": bottle.cepage,
        "appellation": bottle.appellation,
        "millesime": bottle.millesime,
        "taille": bottle.taille,
    }

    # Recherche web pour enrichir l'analyse
    web_context = await search_wine_info(bottle_info)

    try:
        result = await analyze_wine(bottle_info, web_context)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    if result:
        bottle.wine_type = result.get("type_vin")
        bottle.peak_year_start = result.get("apogee_debut")
        bottle.peak_year_end = result.get("apogee_fin")
        bottle.best_pairing = result.get("accord")
        bottle.analysis_done = True

    session.add(bottle)
    await session.commit()
    await session.refresh(bottle)
    return bottle
