"""One-time LLM pre-generation for demo resilience (USER runs this).

Warms the llm_cache over every demo scenario so the recorded demo and the live
judging window never hit a Gemini rate limit. RUN THIS ONCE while quota is fresh
— it needs a working GEMINI_API_KEY (ideally a fresh/paid one; the free tier's
~20 req/day will not cover a full sweep).

    .\backend\venv\Scripts\python.exe -m backend.scripts.pregenerate_llm

It is deliberately separate from the always-on cache layer (services/llm_cache):
that layer serves cached-first on every request; this script just fills it ahead
of time. Safe to re-run — already-cached scenarios are skipped.
"""

import asyncio

from backend.config import settings
from backend.models.database import db_helper, seed_database
from backend.services.llm_cache import llm_cache

# Regulatory questions a judge is likely to ask the chatbot during the demo.
DEMO_QUESTIONS = [
    "What are the NAAQS limits for PM2.5 in India?",
    "What does GRAP Stage IV require?",
    "What is the National Clean Air Programme target?",
    "Which agency enforces air quality standards in Delhi?",
    "What are the penalties for stubble burning?",
    "How is the National Air Quality Index calculated?",
    "What construction dust controls apply under GRAP?",
    "What is CAQM and what powers does it have?",
]

ADVISORY_SCENARIOS = [
    ("delhi", "East Delhi"),
    ("delhi", "Central Delhi"),
    ("mumbai", "Mumbai Suburbs"),
]


async def main():
    if not settings.GEMINI_API_KEY:
        print("No GEMINI_API_KEY configured. Set a FRESH key in backend/.env before "
              "running the pre-generation sweep. Aborting.")
        return

    db_helper.connect()
    await seed_database()

    from backend.services.rag import generate_rag_response
    from backend.services.advisory import advisory_service

    print(f"Pre-generating {len(DEMO_QUESTIONS)} RAG answers...")
    for q in DEMO_QUESTIONS:
        try:
            res = await generate_rag_response(q)
            print(f"  [{res.get('provenance','?'):>9}] {q[:60]}")
        except Exception as e:
            print(f"  [FAILED] {q[:60]} -> {e}")

    print(f"Pre-generating {len(ADVISORY_SCENARIOS)} advisory sets...")
    for city, zone in ADVISORY_SCENARIOS:
        try:
            await advisory_service.get_advisories_for_zone(city, zone)
            print(f"  advisory {city}/{zone} cached")
        except Exception as e:
            print(f"  [FAILED] advisory {city}/{zone} -> {e}")

    stats = await llm_cache.stats()
    print(f"\nDone. Cache now holds {stats['entries']} entries ({stats['backend']}).")


if __name__ == "__main__":
    asyncio.run(main())
