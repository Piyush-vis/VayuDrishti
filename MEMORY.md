# MEMORY.md — Project Memory & Decisions Log

> Durable facts and settled decisions for VayuDrishti. Agents: read this before
> proposing changes; do NOT re-litigate settled decisions; append (never rewrite
> history) when you make a new significant decision. Dates are absolute.

## Current state snapshot (as of 2026-07-19, post Tier-0/Tier-1 build)

- Full stack works end-to-end (smoke-tested route-by-route on local uvicorn + real
  dockerized Mongo). Also works with zero keys / no Mongo (simulator + in-memory mock).
- **Forecaster: direct multi-horizon XGBoost** (one model per horizon 6/12/24/48/72h,
  interpolated curve). RMSE vs persistence: **24h +27.2%, 48h +28.4%, 72h +26.6%**
  (`ml/saved_models/backtest_results.json`). The OLD recursive scheme was a bug (lost
  to persistence) — fixed. Model version xgboost_v3_direct_multihorizon.
- **57 pytest tests green.** All Tier-0 + Tier-1 features (T1-1..T1-10) shipped:
  - Dec 2025 replay wired through every service via `at` (services/replay.py)
  - Forecast-triggered GRAP engine (services/grap.py) + statutory checklists
  - CPF attribution + confidence + pollution rose (services/attribution.py, zero random)
  - HYSPLIT-lite back-trajectories × fires (services/trajectory.py)
  - Health impact engine AQLI/WHO/exposure (services/health_impact.py, CRFs capped)
  - Incident War Room + signal→intervention counter (pages/WarRoom.jsx)
  - Voice/IVR (hooks/useSpeech.js, IVRPreview.jsx)
  - data.gov.in official CPCB feed (services/gov_feed.py, 3500 live records)
  - Exact TreeSHAP via XGBoost pred_contribs (no shap dep) + backtest
  - LLM cache layer (services/llm_cache.py) + pregenerate script (needs fresh key)
  - Provenance badges (LIVE/CACHED/REPLAY/SIMULATED/MODELLED) everywhere
- README fully rewritten (champion formula, numbers-dense, honest, all claims match code).
- ALL WORK COMMITTED incrementally (each milestone its own commit). New routers:
  replay, grap, health, trajectory. New sidebar: Incident War Room, Scenario switcher.
- Docker images NOT yet rebuilt with new features — `docker-compose up -d --build`
  needed before the demo (port 8000 currently held by an OLD docker stack).

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
- 2026-07-19: T1-4a DONE: attribution rebuilt (CPF wind-sector confidence, PMF priors, zero random, per-covariate source labels, replay-aware `at`). Signals are STANDARDIZED against CPCB norms (no2/80 etc.) — raw concentration terms explode at Severe+ and skew shares; don't reintroduce.
- 2026-07-19: T1-1 DONE: replay wired through ALL services via `at` param (axios interceptor stamps every GET). Episode data PERSISTS in real Mongo across restarts — after changing the replay generator, hit POST /replay/episodes/<id>/seed?force=true or old chemistry silently survives (bit us once).
- 2026-07-19: Replay chemistry calibrated: SO2 capped ~31 µg/m³, CO ~5, NO2 ~160 at peak — earlier uncapped values (SO2 357!) created fake industrial attribution + phantom SO2 enforcement breaches.
- 2026-07-19: CONFIRMED: frozen XGBoost is mean-reverting and cannot forecast the Dec build-up (predicts flat ~386 while truth hits 641). GRAP engine (T1-2) must trigger on ensemble: model forecast OR documented persistence-with-trend projection, recording WHICH signal fired. Model stays frozen.
- 2026-07-19: Port 8000 is the user's RUNNING DOCKER STACK (old image) — do not kill; smoke test on 8001. Docker images need rebuild (`docker-compose up -d --build`) before demo to pick up new features.
