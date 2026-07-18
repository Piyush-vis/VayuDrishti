"""LLM cache tests — cached-first serving must never re-spend quota on a repeat,
and must degrade gracefully with no key (allow_live=False)."""
import asyncio

from backend.models.database import db_helper
from backend.services.llm_cache import LLMCache, cache_key


def _fresh_cache(tmp_path):
    db_helper.use_mock_collections()  # forces the JSON-file backend path
    c = LLMCache()
    c._file_cache = {}
    c._save_file = lambda: None  # keep the real data/llm_cache.json untouched
    return c


def test_cache_key_is_stable_and_order_independent():
    k1 = cache_key("ns", {"a": 1, "b": [1, 2]})
    k2 = cache_key("ns", {"b": [1, 2], "a": 1})
    assert k1 == k2
    assert cache_key("ns", {"a": 2}) != k1


def test_generator_runs_once_then_serves_cached(tmp_path):
    c = _fresh_cache(tmp_path)
    calls = {"n": 0}

    async def gen():
        calls["n"] += 1
        return {"answer": "hello"}

    first = asyncio.run(c.get_or_generate("t", {"q": "x"}, gen))
    assert first["source"] == "live"
    assert first["result"]["answer"] == "hello"
    assert calls["n"] == 1

    second = asyncio.run(c.get_or_generate("t", {"q": "x"}, gen))
    assert second["source"] == "cached"
    assert second["result"]["answer"] == "hello"
    assert calls["n"] == 1  # generator NOT called again — quota protected


def test_allow_live_false_returns_miss_without_calling_generator(tmp_path):
    c = _fresh_cache(tmp_path)

    async def gen():
        raise AssertionError("generator must not run when allow_live=False")

    res = asyncio.run(c.get_or_generate("t", {"q": "y"}, gen, allow_live=False))
    assert res["source"] == "miss"
    assert res["result"] is None


def test_distinct_payloads_do_not_collide(tmp_path):
    c = _fresh_cache(tmp_path)

    async def gen_a():
        return {"v": "A"}

    async def gen_b():
        return {"v": "B"}

    a = asyncio.run(c.get_or_generate("t", {"q": "a"}, gen_a))
    b = asyncio.run(c.get_or_generate("t", {"q": "b"}, gen_b))
    assert a["result"]["v"] == "A"
    assert b["result"]["v"] == "B"
