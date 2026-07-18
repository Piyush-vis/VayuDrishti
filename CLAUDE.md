# CLAUDE.md — Agent Onboarding for VayuDrishti

> Read this FIRST if you are an AI agent (or human) working on this repo.
> Then read, in order: `RULES.md` (hard rules — non-negotiable), `plan.md` (what to
> build and in what order), `MEMORY.md` (decisions already made — do not re-litigate),
> `ARCHITECTURE.md` (system design).

## What this project is

**VayuDrishti (वायुदृष्टि)** — AI-powered Urban Air Quality Intelligence Platform for
Indian smart cities. Submission for **ET AI Hackathon 2026, Phase 2** (Problem
Statement 5). **Deadline: 22 July 2026, 11:59 PM IST** — check today's date and treat
the remaining time as the scarcest resource in every decision.

Stack: FastAPI (Python 3.12) + MongoDB (Motor) + XGBoost + LangChain/Gemini agents +
ChromaDB RAG // React 18 + Vite + Tailwind + Leaflet + Recharts // docker-compose.

## How to run

**Docker (canonical, matches submission):**
```powershell
docker-compose up -d          # frontend :5173, backend :8000, mongo :27017
docker logs vayudrishti-backend --tail 50
docker-compose down
```

**Manual dev (faster iteration):**
```powershell
# Backend — MUST run from repo root (absolute `backend.` imports):
.\backend\venv\Scripts\activate
uvicorn backend.main:app --reload --port 8000

# Frontend (second terminal):
cd frontend ; npm run dev
```

**Tests / build gates (run before claiming any backend/frontend change done):**
```powershell
.\backend\venv\Scripts\python.exe -m pytest backend/tests/ -q
cd frontend ; npm run build
```

**Retrain the forecaster (offline step, never at server start):**
```powershell
.\backend\venv\Scripts\python.exe -m backend.ml.train_model
```

## Repo map (the parts that matter)

```
backend/
  main.py                 FastAPI app + lifespan (DB seed, scheduler start)
  config.py               pydantic-settings; reads backend/.env
  routers/                aqi, stations, predict, attribution, enforcement, advisory, chat, data
  services/
    data_ingestion.py     AQICN/Open-Meteo fetch, NAQI calc, physically-grounded simulator
    prediction.py         XGBoost recursive forecaster + statistical fallback
    attribution.py        rule-based source attribution (TomTom, NASA FIRMS, circular wind mean)
    enforcement.py        threshold scan -> priority actions; AI analysis caching
    advisory.py           multi-language advisories (agent -> raw Gemini -> templates)
    agents.py             REAL tool-calling agents (bind_tools + ReAct loop) — the crown jewel
    rag.py                ChromaDB + TF-IDF-fallback RAG over CPCB docs
    scheduler.py          APScheduler: hourly ingest, ~65min enforcement scan
  models/database.py      Motor wrapper + full in-memory MockCollection fallback
  ml/train_model.py       real lag/rolling feature engineering, chrono split, persistence baseline
  tests/                  pytest suite — keep green
frontend/src/
  App.jsx                 routes; pages/ = Dashboard, Predictions, Enforcement, Advisory, Compare
  services/api.js         all API calls; base URL via VITE_API_BASE_URL
  components/             map/ (AQIMap, TimeSlider), charts/, panels/, common/
docs/                     DETAILED_DOCUMENT.md, PRESENTATION_DECK.md, DEMO_SCRIPT.md
plan.md                   THE build plan — feature tiers, schedule, priorities
RULES.md                  hard rules for all agents
MEMORY.md                 decisions log + current-state snapshot
```

## Critical gotchas (each of these has already burned us once)

1. **Backend imports are absolute (`from backend.x import y`)** — uvicorn must be
   launched from the repo root as `backend.main:app`. `cd backend && uvicorn main:app`
   breaks. The Dockerfile is built around this; don't "fix" it.
2. **Motor's `insert_one()` mutates the dict you pass in**, injecting a raw `ObjectId`
   as `_id` which FastAPI cannot JSON-serialize (500). The in-memory mock deep-copies,
   so this bug ONLY appears against real MongoDB. After any `insert_one(payload)`
   where `payload` is later returned: `payload.pop("_id", None)` or stringify it.
   Regression tests exist in `backend/tests/test_response_serialization.py`.
3. **Mock DB ≠ real Mongo.** `models/database.py` swaps in `MockCollection` when Mongo
   is unreachable. It only supports `$in/$gte/$lte`, basic sort/limit/upsert. Anything
   fancier silently misbehaves in mock mode. Always verify DB-touching changes against
   the dockerized Mongo (`docker-compose up -d mongodb`), not just the mock.
4. **Gemini free tier is tiny** (429s observed at ~20 req/day on some models). Never
   burn quota in test loops. All LLM paths MUST keep their deterministic fallbacks
   working (templates / rule-based / statistical). Cache LLM outputs in Mongo when the
   result is reusable (advisories are cached 1h; enforcement AI analyses are cached on
   the action document — follow that pattern).
5. **Windows dev box, cp1252 console.** Printing Devanagari/Tamil to stdout in a test
   script crashes with UnicodeEncodeError. Write UTF-8 to files instead of printing.
6. **AQICN `iaqi.*.v` values are AQI sub-indices (0-500), NOT µg/m³.** They must go
   through `sub_index_to_concentration()` before any concentration math. Don't
   reintroduce the raw pass-through.
7. **Timestamps are naive UTC** (`datetime.utcnow()`) throughout the DB. Comparing
   against tz-aware datetimes throws. Strip tzinfo at API boundaries (see
   `routers/aqi.py` `/history`).
8. **`.env` keys were exposed to tool transcripts earlier** — never `cat`/print
   `backend/.env`. Read specific non-secret keys with targeted greps if needed.
9. **`docker compose build` context is the repo root** — `.dockerignore` keeps it
   small; don't add build-context-bloating paths.
10. **Ports:** backend 8000, frontend 5173, mongo 27017. Kill stale processes
    (`netstat -ano | grep LISTENING`) before restarting; port conflicts have wasted
    time repeatedly.

## Conventions

- Python: follow the existing service-object pattern (`XService` class +
  `x_service = XService()` singleton). Type hints on public methods. Comments only for
  non-obvious constraints.
- Frontend: functional components, Tailwind utility classes matching the existing
  dark-navy design system (`glass-card`, slate palette, 10px uppercase label style).
- Every external API call: timeout + try/except + documented fallback. The app must
  work with zero API keys configured (simulator mode) — never break that property.
- New backend features get at least one pytest covering the failure mode most likely
  to recur.
- Commit policy: ask the user before committing. Recommend commits at each working
  milestone (there is multi-day uncommitted work — a real risk).
