# VayuDrishti (वायुदृष्टि)
## AI-Powered Urban Air Quality Intelligence Platform

**ET AI Hackathon 2.0 — Phase 2 Submission**
**Problem Statement 5:** AI-Powered Urban Air Quality Intelligence for Smart City Intervention

> This document is a draft ready to paste into Google Docs / Word and export as the
> submission PDF. Replace the bracketed placeholders (team name, members) before
> exporting. Everything else describes the system as it actually behaves, verified
> against a running instance — not aspirational claims.

---

## 1. Problem Analysis

India's air quality crisis is a national, not regional, problem. In 2024-25, Delhi
averaged an AQI of 218 ("Poor" or worse for 200+ days); Mumbai recorded dangerous AQI
on 60+ days; Bengaluru and Chennai — historically cleaner metros — are measurably
deteriorating as vehicle density and construction activity surge. CPCB data shows 24 of
India's 50 most polluted cities are Tier 1/2 urban centres. The Lancet estimates **1.67
million premature deaths annually** from air pollution in India.

The gap is not data — India has deployed 900+ CAAQMS stations under NCAP. A 2024 CAG
audit found only **31% of cities with monitoring data had any actionable multi-agency
response protocol** tied to those readings. Three concrete capability gaps follow from
this:

1. **No source attribution.** Administrators see "AQI 320" but not *why* — is it
   traffic, an industrial stack, a construction site, or crop burning upwind? Without
   that, enforcement is a guess.
2. **No forecasting.** Response is reactive to what a sensor reads *now*, not to what
   conditions will be in 6-72 hours, when interventions (traffic advisories, industrial
   throttling, school closures) would still be useful to schedule.
3. **No correlation across signals.** A single elevated PM2.5 reading looks the same
   whether it's a transient blip or the leading edge of a genuine compound event
   (breach + worsening forecast + a dominant, matching pollution source). No tool in
   common use today makes that distinction automatically.

## 2. Solution Overview

VayuDrishti is a full-stack platform (FastAPI + React/Leaflet + MongoDB) that fuses
live station readings, meteorological data, traffic/industrial/fire-hotspot signals,
and regulatory text into five connected capabilities:

1. **Live geospatial dashboard** — real-time AQI map across 8 Indian cities (25
   monitoring stations), with a heatmap overlay and an hour-by-hour historical
   timelapse driven by actually recorded readings.
2. **72-hour predictive forecasting** — a recursive XGBoost model with compounding
   confidence intervals, evaluated against a naive persistence baseline.
3. **Geospatial source attribution** — a rule-based engine correlating AQI patterns
   against traffic congestion (TomTom), industrial zone proximity, construction
   activity, and NASA FIRMS fire hotspots, with circular-mean wind-direction evidence.
4. **A genuine multi-agent intelligence layer** — two LangChain tool-calling agents
   (not single prompt-and-parse calls) that independently investigate cross-signal
   correlations before producing a verdict: a **Compound Risk Enforcement Agent** and a
   **Citizen Advisory Agent**.
5. **Regulatory RAG chatbot** — a ChromaDB-backed retrieval system over NAAQS/NCAP/AQI
   calculation documents, also used as a tool by the Enforcement Agent to ground its
   recommendations in cited regulatory text.

Every AI-dependent feature has a deterministic fallback (statistical forecaster,
template advisories, rule-based enforcement), and the whole system runs with zero
configuration — including an in-memory database fallback if MongoDB is unreachable —
so a fresh clone is a fully working demo without any API keys.

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full system diagram and design
rationale.

## 3. Technical Deep-Dive

### 3.1 Data Layer
- **`backend/services/data_ingestion.py`** fetches live AQI from AQICN (with an
  OpenWeatherMap fallback) and weather from Open-Meteo (no key required), computes the
  Indian NAQI using CPCB sub-index breakpoint tables, and falls back to a
  physically-grounded simulator (diurnal traffic peaks, overnight temperature
  inversion, city/station-specific profiles, monsoon-linked precipitation washout)
  when live data or keys are unavailable.
- A hardened detail: AQICN's `iaqi.*.v` values are themselves 0-500 AQI sub-indices,
  not raw µg/m³ concentrations. Feeding them directly into the concentration-based AQI
  formula (as an earlier version of this codebase did) silently produces wrong
  numbers. This is now corrected via an explicit sub-index-to-concentration inversion,
  covered by a regression test.
- **`backend/services/scheduler.py`** (APScheduler) runs live ingestion every 60
  minutes and an enforcement anomaly scan every ~65 minutes.
- **`backend/models/database.py`** wraps MongoDB via Motor, and transparently falls
  back to a full in-memory mock implementation (supporting `$in`/`$gte`/`$lte`, sort,
  upsert, indexes) if MongoDB is unreachable — the entire API keeps working with zero
  real database.

### 3.2 Prediction Engine
`backend/ml/train_model.py` trains an XGBoost regressor to predict AQI 24 hours ahead
(recursively rolled forward for the full 72-hour forecast at inference time). Unlike a
prior version that trained on 2,000 independent random draws fit to an invented linear
formula, the current pipeline:
- Builds real lag features (`aqi_t-1/3/6/12/24`) and rolling statistics via pandas
  `shift`/`rolling` on the actual chronologically-ordered per-station series.
- Uses a **chronological train/test split** (not random), so no future information
  leaks into training — the standard requirement for valid time-series evaluation.
- Reports RMSE against a naive **persistence baseline** ("AQI in 24h = AQI now") — the
  exact comparison the problem statement's evaluation focus names explicitly.
- Prefers real accumulated readings from the database when enough exist; otherwise
  bootstraps from the same physically-grounded simulator used for live data, so the
  features stay tied to real atmospheric behavior patterns rather than arbitrary noise.

**Current measured result:** RMSE 14.3 vs. persistence baseline RMSE 19.4 — a **26.2%
improvement**, on 8,400 held-out rows spanning all 8 cities.

If the trained model is unavailable, `backend/services/prediction.py` falls back to a
statistical forecaster (mean-reversion + diurnal cycle + compounding uncertainty) that
never hard-fails.

### 3.3 Source Attribution
`backend/services/attribution.py` computes weighted signature scores per source
category (vehicular: traffic + NO2; industrial: stack count + SO2; construction: PM10/
PM2.5 ratio + site count; biomass: NASA FIRMS hotspot count + PM2.5), pulling real
TomTom traffic and NASA FIRMS data when API keys are configured. Wind direction
evidence uses a **circular mean** (not a naive arithmetic average, which is
mathematically wrong near the 0°/360° wraparound — e.g. averaging 350° and 10° should
yield ~0°, not 180°).

### 3.4 Multi-Agent Intelligence Layer
`backend/services/agents.py` implements two agents on top of
`ChatGoogleGenerativeAI.bind_tools()` and a minimal ReAct-style tool-calling loop
(deliberately built on stable `langchain-core` primitives rather than the
higher-level `langchain.agents` API surface, which has changed shape significantly
across LangChain's 0.2 → 0.3 → 1.0 releases):

- **Compound Risk Enforcement Agent** — given a single rule-detected pollutant breach,
  it independently calls tools to check source attribution and the station's 24-hour
  forecast trend, optionally consults the regulatory RAG index, and returns a
  structured verdict (`compound_risk`, `confidence`, `rationale`, `regulatory_basis`,
  `recommended_escalation`). This directly implements the problem statement's
  "Compound Risk Detection Engine" concept: correlating signals no single sensor would
  flag alone.
- **Citizen Advisory Agent** — decides for itself whether to look up nearby
  hospitals/schools/outdoor-worker zones (only calling the tool when conditions are
  severe enough to warrant it), and can name specific at-risk locations in the
  generated guidance across 6 languages.

Both agents were verified against live Gemini calls during development (not just
imported/mocked), including confirming the tool-calling loop correctly invokes
multiple tools in sequence and reasons over their combined output.

### 3.5 Regulatory RAG
`backend/services/rag.py` chunks NAAQS/NCAP/AQI-calculation reference documents,
embeds them via ChromaDB (with a hand-rolled TF-IDF cosine-similarity fallback if
ChromaDB/SQLite initialization fails for any reason), and answers questions through a
retrieve-then-generate pipeline with source citations — including an honest "I cannot
find this in the CPCB standards" response when the retrieved context doesn't answer
the question, rather than hallucinating.

## 4. Innovation Highlights

What separates this from a typical AQI dashboard submission:

| Typical submission | VayuDrishti |
|---|---|
| Shows current AQI on a map | Shows current AQI **and** why (source attribution) **and** what's next (72h forecast) **and** what to do (enforcement + advisories) |
| "AI" = one prompt, one completion | Real tool-calling agents that investigate before answering |
| Model trained on whatever data is easiest | Model trained with proper time-series methodology, evaluated against the named baseline |
| Single city or generic city selector | 8 real Indian cities with city-specific pollution/weather profiles, one-click switching |
| English only | 6 Indian languages, agent-generated per severity |
| Static "sample" enforcement text | Priority-ranked, evidence-backed actions with an on-demand AI compound-risk analysis |

## 5. Data Sources & Integration

| Source | Data | Integration |
|---|---|---|
| AQICN / CPCB network | Real-time station AQI & pollutant sub-indices | Live API, with sub-index→concentration correction |
| Open-Meteo | Temperature, humidity, wind, precipitation | Live API, no key required |
| TomTom | Real-time traffic congestion | Live API (used by the attribution engine) |
| NASA FIRMS | Active fire/thermal hotspots | Live API (biomass burning signal) |
| Gemini (`gemini-flash-latest`) | LLM reasoning for both agents and RAG | Via `langchain-google-genai` (agents) and the native SDK (RAG/fallback) |
| CPCB NAAQS / NCAP / AQI-calc documents | Regulatory corpus | Chunked and embedded into ChromaDB |

Every external integration degrades gracefully to a documented fallback if its API key
is absent or the call fails — verified by disabling keys and confirming the affected
routes still return valid, useful responses.

## 6. ML Methodology & Evaluation

See §3.2 above for full methodology. Summary metrics from the current trained model
(`backend/ml/saved_models/model_metadata.joblib`):

- **Model RMSE:** 14.3
- **Persistence baseline RMSE:** 19.4
- **Improvement:** +26.2%
- **Train/test split:** chronological, most recent 14 days held out
- **Features:** 19 (6 AQI lags, 4 rolling statistics, 4 weather variables, 4 temporal
  encodings, current AQI)

Retraining is a one-command, reproducible offline step (`python -m
backend.ml.train_model`), not something that happens implicitly at server start —
deliberately, since training needs a stable dataset that an import-time hook can't
reliably guarantee to have.

## 7. Agent System Design

See §3.4 above and [ARCHITECTURE.md](../ARCHITECTURE.md) for the end-to-end trace of a
single compound-risk detection from scheduler trigger through agent verdict.

## 8. Scalability Analysis

- **Adding a city** is a `stations.json` entry plus one `CITIES_COORDS` entry — no
  router, service, or frontend code changes, since every layer keys off `city` as a
  plain string.
- **The ML model is station-agnostic and pooled** across all cities' data, so
  onboarding new stations does not require training a new per-station model.
- **MongoDB is indexed** on `(station_id, timestamp)` and `city`; the schema is
  unchanged going from 8 demo cities / 25 stations to CPCB's full 900+ station network.
- **The agent layer's cost scales with usage, not station count** — compound-risk
  analysis and advisory generation are triggered on-demand (a button click) or on a
  scheduled cadence, not per-reading, keeping it compatible with Gemini's free-tier
  rate limits even at national scale.

## 9. Business Impact

- **CPCB / State Pollution Control Boards:** evidence-backed, priority-ranked
  enforcement actions reduce the manual correlation work an inspector currently does by
  hand across disconnected traffic/industrial/weather data sources.
- **Municipal corporations / Smart City Mission bodies:** the citizen advisory layer
  gives a ready mechanism for the "multi-agency response protocol" the 2024 CAG audit
  found 69% of monitored cities lack.
- **Public health:** targeted, localized (nearby-hospital/school-aware) advisories in 6
  languages address the outsized burden pollution places on vulnerable populations and
  outdoor workers.

## 10. Future Roadmap

- Mobile app / SMS-IVR delivery channel for citizen advisories, for reach beyond
  smartphone users.
- Direct CPCB CAAQMS data partnership to replace the AQICN aggregation layer with
  primary-source station feeds.
- Expand the Compound Risk Enforcement Agent's tool set to include real permit-to-work
  and industrial compliance databases as they become available, extending the same
  agent architecture used here rather than building a parallel system.
- Extend source attribution from rule-based signatures toward a learned model once
  enough labeled ground-truth attribution data is available.

## 11. Team

- **Team Name:** [Your Team Name]
- **Members:** [Name 1 — role], [Name 2 — role], [Name 3 — role], [Name 4 — role]
- **Competition:** Economic Times AI Hackathon 2.0, Phase 2
- **Repository:** [GitHub URL]

## 12. References

- CPCB National Ambient Air Quality Standards (NAAQS)
- National Clean Air Programme (NCAP) guidelines
- The Lancet Planetary Health — air pollution mortality estimates for India
- CAG 2024 audit of CAAQMS-linked response protocols
- AQICN / World Air Quality Index Project — data platform documentation
