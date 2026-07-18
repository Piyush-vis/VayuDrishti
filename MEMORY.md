# MEMORY.md — Project Memory & Decisions Log

> Durable facts and settled decisions for VayuDrishti. Agents: read this before
> proposing changes; do NOT re-litigate settled decisions; append (never rewrite
> history) when you make a new significant decision. Dates are absolute.

## Current state snapshot (as of 2026-07-19)

- Full stack works end-to-end via `docker-compose up -d` with REAL MongoDB, verified
  route-by-route. Also works with zero keys / no Mongo (simulator + in-memory mock).
- 8 cities, 25 stations, 7 days seeded hourly history on first boot.
- XGBoost forecaster (24h-ahead, recursive to 72h): **RMSE 14.3 vs persistence 19.4
  (+26.2%)** on 8,400 chronologically held-out rows. Metadata in
  `backend/ml/saved_models/model_metadata.joblib`.
- Two genuine LangChain tool-calling agents verified against live Gemini:
  compound-risk enforcement agent (tools: attribution, forecast trend, regulatory
  RAG) and citizen advisory agent (tool: vulnerable-location lookup; 6 languages).
- RAG over 3 CPCB doc files via ChromaDB (19 chunks) with TF-IDF fallback.
- 17 pytest tests green.
- Deliverable drafts exist: docs/DETAILED_DOCUMENT.md, PRESENTATION_DECK.md,
  DEMO_SCRIPT.md; plus ARCHITECTURE.md, LICENSE, README.
- NOTHING IS COMMITTED from the last several days of work — user must commit soon.

## Settled decisions

| Date | Decision | Why (short) |
|---|---|---|
| 2026-07-08 | PS5 (Urban Air Quality) chosen; project named VayuDrishti | Only PS with free live real data; emotional resonance; visual demo |
| 2026-07-18 | Full audit + hardening sprint executed | "Vibe-coded" base had critical bugs (startup-breaking packaging, fake timelapse, fabricated ML training data) |
| 2026-07-18 | ML retrained on real lag/rolling features, chronological split, persistence baseline reported | The PS's evaluation focus names "RMSE vs persistence baseline" explicitly |
| 2026-07-18 | Real tool-calling agent layer built (`services/agents.py`) on langchain-core primitives, not `langchain.agents` API | Higher-level API unstable across LC 0.2→1.0; bind_tools loop is version-stable |
| 2026-07-18 | Prediction training is an OFFLINE step (`python -m backend.ml.train_model`), never at import/startup | Import-time training raced the DB init and was unreliable |
| 2026-07-18 | Requirements pinned to exact verified versions; Docker image on python:3.12-slim | xgboost 3.3.0 requires py>=3.12; reproducibility |
| 2026-07-18 | Deprecated `google.generativeai` SDK fully migrated to `google-genai` | Deprecation warnings at every startup; old SDK EOL |
| 2026-07-19 | **PS DECISION RE-CONFIRMED: stay on PS5** after user asked to reconsider all 8 PS | Working verified product + only-PS-with-real-data + 3.5 days left; switching burns ~80% of advantage (full rationale in plan.md) |
| 2026-07-19 | Differentiation strategy driven by multi-agent web research → plan.md | Every team has AI agents; winning requires features others won't think of/dare |

## Known constraints & landmines (do not rediscover these)

- **Gemini free tier: ~20 req/day observed limit; 429s hit on 2026-07-19.** LLM calls
  must be cached and never in loops. Fresh/paid key needed before demo recording.
- **Motor `insert_one` mutates payloads with ObjectId `_id`** → 500s only with real
  Mongo. Strip before returning. Tests cover prediction + attribution paths.
- **Mock DB supports only $in/$gte/$lte + basic sort/limit/upsert.**
- **AQICN iaqi values are sub-indices, not concentrations** — invert via
  `sub_index_to_concentration()`.
- **Naive-UTC timestamps everywhere**; strip tzinfo from parsed inputs.
- **Backend must launch from repo root** (`uvicorn backend.main:app`).
- **Windows console is cp1252** — never print Indic text in scripts.
- **July = monsoon = low real AQI in India** — live data may look undramatic; demo
  needs an episode-replay/demo-mode answer (see plan.md).
- **API keys (Gemini/AQICN/TomTom) passed through tool transcripts on 2026-07-18 and
  2026-07-19; user advised to rotate.** OPENWEATHERMAP + NASA_FIRMS keys are unset.
- ~10GB backend Docker image (torch/CUDA pulled by sentence-transformers chain) —
  works but heavy; not worth optimizing before deadline unless build breaks.

## Competition facts

- ET AI Hackathon 2026 (Economic Times + Unstop), Phase 2 build sprint.
- **Deadline: 22 July 2026, 11:59 PM IST** (Unstop submission).
- Submit: detailed PDF document, 3-4 min demo video, GitHub URL, extras (diagrams, deck).
- Judging: Innovation 25% · Business Impact 25% · Technical Excellence 20% ·
  Scalability 15% · UX 15%.
- Phase 3 (finalists): 10-15 min live presentation + demo + Q&A. Prizes ₹5L/3L/2L.
- PS5 evaluation focus: attribution accuracy, forecast RMSE vs persistence,
  enforcement recommendation quality, advisory relevance + language coverage,
  signal→intervention response-time reduction.

## Decisions appended by agents (add below, one line each, with date)

- 2026-07-19: 10-agent research workflow ran (59 candidate features, 3 judges, critic); full digest at `docs/research/research_digest.txt`; synthesized into `plan.md` — plan.md tiers are now the build order.
- 2026-07-19: CRITICAL landmine found by code-audit critic: `attribution.py` uses random-seeded covariates and has NO confidence field — fix is Tier 0/T1-4 (CPF wind-sector method), before any new feature.
- 2026-07-19: "72h forecast gap" confirmed a phantom — forecaster already serves 72h; the missing piece is a 24/48/72h RMSE-vs-persistence backtest ARTIFACT (script + README numbers), NOT a model change. Model is FROZEN until after submission.
- 2026-07-19: Replay = build exactly ONCE (Dec 13-14 2025 GRAP-IV episode, real headline station values, simulator-calibrated, honest on-screen label, wired through ALL services). Voice = build exactly ONCE (Web Speech TTS + phone-frame + MP3 fallback; NO live telephony).
- 2026-07-19: Cut list locked in plan.md §5 (MapLibre, telephony, GEE, LUR/GNN, routing, retraining, cigarette card) — do not re-litigate.
- 2026-07-19: Public-repo strategy: publish a FRESH clean `vayudrishti` repo for submission; this working repo (with plan.md/CLAUDE.md/strategy files) stays private.
