import asyncio
from duckduckgo_search import DDGS


def _build_query(bottle_info: dict) -> str:
    parts = [
        bottle_info.get("domaine"),
        bottle_info.get("appellation"),
        bottle_info.get("cepage"),
        str(bottle_info.get("millesime")) if bottle_info.get("millesime") else None,
        "vin dégustation accords",
    ]
    return " ".join(p for p in parts if p)


def _search_sync(bottle_info: dict) -> str:
    query = _build_query(bottle_info)
    print(f"[SEARCH] Query: {query}", flush=True)
    for attempt in range(3):
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=4))
            context = "\n\n".join(
                f"Source: {r.get('title', '')}\n{r.get('body', '')}"
                for r in results
            )
            print(f"[SEARCH] Found {len(results)} results", flush=True)
            return context
        except Exception as e:
            print(f"[SEARCH] Attempt {attempt+1} failed: {e}", flush=True)
            if attempt < 2:
                import time
                time.sleep(2)
    return ""


async def search_wine_info(bottle_info: dict) -> str:
    return await asyncio.to_thread(_search_sync, bottle_info)
