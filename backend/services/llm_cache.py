"""LLM response cache — quota-resilient serving for all Gemini paths.

The Gemini free tier is tiny (429s observed at ~20 req/day) and a live demo
must never stall on a rate limit. This cache serves cached-first: a hit returns
instantly (labelled CACHED); a miss calls the model live if a key is configured,
then stores the result for next time. With zero key, callers fall back to their
deterministic templates/rules — the app always answers.

Backed by Mongo when available, with a JSON-file fallback so the cache survives
restarts even in mock-DB mode. Keys are a stable hash of (namespace, payload).

A one-time batch pre-generation over all demo scenarios (replay states x
languages x personas) can be run while quota is fresh — see
`scripts/pregenerate_llm.py` — but that step needs a fresh/paid GEMINI key
(a USER action item) and is intentionally separate from this always-on layer.
"""

import hashlib
import json
import os
from datetime import datetime
from typing import Any, Callable, Dict, Optional

from backend.models.database import db_helper

_CACHE_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "llm_cache.json"
)


def cache_key(namespace: str, payload: Any) -> str:
    raw = json.dumps({"ns": namespace, "p": payload}, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


class LLMCache:
    def __init__(self):
        self._file_cache: Optional[Dict[str, Any]] = None

    # ---- JSON-file fallback (used when Mongo is the in-memory mock) ----
    def _load_file(self) -> Dict[str, Any]:
        if self._file_cache is None:
            try:
                with open(_CACHE_FILE, encoding="utf-8") as f:
                    self._file_cache = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                self._file_cache = {}
        return self._file_cache

    def _save_file(self):
        if self._file_cache is None:
            return
        os.makedirs(os.path.dirname(_CACHE_FILE), exist_ok=True)
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(self._file_cache, f, ensure_ascii=False, indent=2)

    @property
    def _use_mongo(self) -> bool:
        return getattr(db_helper, "is_connected", False) and db_helper.db is not None

    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        if self._use_mongo:
            try:
                doc = await db_helper.db["llm_cache"].find_one({"_id": key})
                return doc
            except Exception:
                pass
        return self._load_file().get(key)

    async def set(self, key: str, value: Dict[str, Any]):
        record = {**value, "cached_at": datetime.utcnow().isoformat()}
        if self._use_mongo:
            try:
                await db_helper.db["llm_cache"].update_one(
                    {"_id": key}, {"$set": record}, upsert=True
                )
                return
            except Exception:
                pass
        fc = self._load_file()
        fc[key] = record
        self._save_file()

    async def get_or_generate(
        self,
        namespace: str,
        payload: Any,
        generator: Callable,
        *,
        allow_live: bool = True,
    ) -> Dict[str, Any]:
        """Return {result, source, cached_at}. source ∈ live|cached.

        `generator` is an async callable returning the raw result dict; it is
        only invoked on a cache miss AND when allow_live is True.
        """
        key = cache_key(namespace, payload)
        hit = await self.get(key)
        if hit is not None:
            return {
                "result": hit.get("result"),
                "source": "cached",
                "cached_at": hit.get("cached_at"),
            }
        if not allow_live:
            return {"result": None, "source": "miss", "cached_at": None}
        result = await generator()
        if result is not None:
            await self.set(key, {"result": result, "namespace": namespace})
        return {"result": result, "source": "live", "cached_at": None}

    async def stats(self) -> Dict[str, Any]:
        if self._use_mongo:
            try:
                n = await db_helper.db["llm_cache"].count_documents({})
                return {"backend": "mongo", "entries": n}
            except Exception:
                pass
        return {"backend": "json-file", "entries": len(self._load_file())}


llm_cache = LLMCache()
