import json
import time
import httpx
from app.core.config import settings


class AIClient:
    def __init__(self) -> None:
        self.gemini_key = settings.gemini_api_key
        self.gemini_model = settings.gemini_model
        self.gemini_base_url = settings.gemini_base_url
        self.ollama_url = settings.ollama_url
        self.ollama_model = settings.ollama_model

    async def generate_text(self, prompt: str) -> str:
        if self.gemini_key:
            try:
                return await self._gemini_generate(prompt)
            except Exception:
                # Fall back to Ollama
                pass

        return await self._ollama_generate(prompt)

    async def _gemini_generate(self, prompt: str) -> str:
        url = f"{self.gemini_base_url}/models/{self.gemini_model}:generateContent"
        params = {"key": self.gemini_key}
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": prompt}]}
            ]
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, params=params, json=payload)
            resp.raise_for_status()
            data = resp.json()

        candidates = data.get("candidates", [])
        if not candidates:
            raise ValueError("Gemini returned no candidates")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise ValueError("Gemini returned empty content")
        return parts[0].get("text", "").strip()

    async def _ollama_generate(self, prompt: str) -> str:
        if not self.ollama_url:
            return "[fallback] No Gemini key configured and no Ollama URL available."

        payload = {"model": self.ollama_model, "prompt": prompt, "stream": False}
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{self.ollama_url}/api/generate", json=payload)
            resp.raise_for_status()
            data = resp.json()

        return data.get("response", "").strip() or "[fallback] Empty response from Ollama."

    async def check_gemini(self) -> dict:
        if not self.gemini_key:
            return {"ok": False, "error": "GEMINI_API_KEY not set"}
        if not self.gemini_base_url:
            return {"ok": False, "error": "GEMINI_BASE_URL not set"}
        if not self.gemini_model:
            return {"ok": False, "error": "GEMINI_MODEL not set"}

        url = f"{self.gemini_base_url}/models/{self.gemini_model}:generateContent"
        params = {"key": self.gemini_key}
        payload = {
            "contents": [{"role": "user", "parts": [{"text": "ping"}]}],
            "generationConfig": {"maxOutputTokens": 1, "temperature": 0},
        }
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.post(url, params=params, json=payload)
                resp.raise_for_status()
            return {"ok": True, "latency_ms": int((time.monotonic() - start) * 1000)}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    async def check_ollama(self) -> dict:
        if not self.ollama_url:
            return {"ok": False, "error": "OLLAMA_URL not set"}
        if not self.ollama_model:
            return {"ok": False, "error": "OLLAMA_MODEL not set"}

        payload = {"model": self.ollama_model, "prompt": "ping", "stream": False}
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.post(f"{self.ollama_url}/api/generate", json=payload)
                resp.raise_for_status()
            return {"ok": True, "latency_ms": int((time.monotonic() - start) * 1000)}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}
