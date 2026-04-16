import time
from typing import Any

import httpx

from app.core.config import settings


class SerpApiService:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = (api_key or "").strip() or settings.serpapi_api_key
        self.engine = settings.serpapi_engine
        self.tbm = settings.serpapi_tbm
        self.num_results = settings.serpapi_num_results
        self.gl = settings.serpapi_gl
        self.hl = settings.serpapi_hl

    async def search(self, query: str, engine: str | None = None, tbm: str | None = None) -> dict[str, Any]:
        if not self.api_key:
            raise ValueError("SERPAPI_API_KEY not set")

        use_engine = (engine or "").strip() or self.engine
        use_tbm = tbm if tbm is not None else self.tbm

        params: dict[str, Any] = {
            "engine": use_engine,
            "q": query,
            "api_key": self.api_key,
            "num": self.num_results,
        }
        # `tbm` is only meaningful for the `google` engine.
        if use_engine == "google" and use_tbm:
            params["tbm"] = use_tbm
        if self.gl:
            params["gl"] = self.gl
        if self.hl:
            params["hl"] = self.hl

        start = time.monotonic()
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get("https://serpapi.com/search.json", params=params)
            resp.raise_for_status()
            data = resp.json()

        return {
            "latency_ms": int((time.monotonic() - start) * 1000),
            "raw": data,
            "engine": use_engine,
            "tbm": use_tbm if use_engine == "google" else None,
        }

    @staticmethod
    def extract_results(payload: dict[str, Any]) -> list[dict[str, Any]]:
        raw = payload.get("raw") or {}
        # SerpAPI can return different keys depending on engine/tbm.
        blocks = (
            raw.get("news_results")
            or raw.get("top_stories")
            or raw.get("stories")
            or raw.get("organic_results")
            or []
        )
        results: list[dict[str, Any]] = []
        if isinstance(blocks, list):
            for item in blocks:
                if not isinstance(item, dict):
                    continue
                title = item.get("title") or ""
                link = item.get("link") or item.get("url") or ""
                snippet = item.get("snippet") or item.get("summary") or item.get("description") or ""
                source = item.get("source") or item.get("publisher") or ""
                date = item.get("date") or item.get("published_date") or item.get("published_at") or ""
                if not (title or link or snippet):
                    continue
                results.append(
                    {
                        "title": str(title),
                        "url": str(link),
                        "snippet": str(snippet),
                        "source": str(source),
                        "date": str(date),
                    }
                )
        return results
