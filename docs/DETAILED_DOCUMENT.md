# VayuDrishti (वायुदृष्टि)
## AI-Powered Urban Air Quality Intelligence Platform

**ET AI Hackathon 2.0 — Phase 2 Submission**  
**Team Name:** Codeonauts  
**Team Members:** Piyush Vishwakarma (Team Leader), Tejavath Praveen Sai  
**Problem Statement 5:** AI-Powered Urban Air Quality Intelligence for Smart City Intervention  
**Repository:** https://github.com/Piyush-vis/VayuDrishti  

> This document describes the system as it actually behaves, verified
> against a running instance — not aspirational claims. Every number below traces to
> a committed artifact, a cited publication, or code a judge can open.

---

## 1. Problem Analysis

India's air quality crisis is a national, not regional, problem. The Lancet estimates
**1.67 million premature deaths annually** from air pollution in India; Dalberg/CII
put the economic cost at **~$95B per year — roughly 3% of GDP**. In 2024-25, Delhi
averaged an AQI of 218 ("Poor" or worse for 200+ days); Mumbai recorded dangerous AQI
on 60+ days; Bengaluru and Chennai — historically cleaner metros — are measurably
deteriorating as vehicle density and construction activity surge.

The gap is not data — India has deployed 900+ CAAQMS stations under NCAP, and the
official real-time feed is published on data.gov.in. The gap is **execution between
the reading and the response**:

1. **The government's own graded-response policy is executed reactively.** CAQM's
   Graded Response Action Plan (GRAP) states its stages "shall be invoked **in
   advance**" based on forecasts. Yet **13 of 17 GRAP invocations in winter 2025-26
   were reactive** (ThePrint/CEEW). The concrete failure: on **10 Nov 2025 Delhi hit
   AQI 362; GRAP Stage III came only on 11 Nov, at 425+** — more than 24 hours after
   the signal, at the cost of a full day of statutory protections.
2. **No source attribution.** Administrators see "AQI 320" but not *why* — traffic,
   an industrial stack, construction dust, or crop burning upwind? Without that,
   enforcement is a guess. Only Delhi buys real-time apportionment today (DPCC pays
   IIT-Kanpur crores for it); the other cities get nothing.
3. **No actionable forecasting.** Only **8 of the 131 NCAP non-attainment cities**
   have any early-warning system. Response is keyed to what a sensor reads *now*,
   not to what conditions will be in 24-72 hours, when interventions (truck bans,
   construction halts, school closures) could still be scheduled to matter.
4. **No correlation across signals.** A single elevated PM2.5 reading looks the same
   whether it is a transient blip or the leading edge of a genuine compound event
   (breach + worsening forecast + a dominant, matching source). No tool in common
   use makes that distinction automatically.

**The sharpest framing of the opportunity:** India already wrote the policy that
responds to forecasts. It fails to execute it on time. That is an automation problem —
and automation is what this platform does.

## 2. Solution Overview — One Chain, One Win

VayuDrishti is a full-stack platform (FastAPI + React/Leaflet + MongoDB + XGBoost +
LangChain/Gemini) built around a single spine — every feature is a link in one chain,
which is also the demo's war-room flow:

```
Forecast sees the crisis coming (24-72h, RMSE beats persistence at every horizon)
   → GRAP engine drafts the Stage III/IV statutory order BEFORE the threshold is crossed
      → evidence attached: CPF source attribution + back-trajectories over Punjab fires
         → human impact quantified: people exposed, life-years lost, deaths averted
            → citizens hear it in their own language (voice advisory)
               → counter: signal → drafted intervention in seconds, vs the >24h govt lag
```

In the Dec 2025 replay (§3.6), the platform drafts the Stage III/IV invocation orders
with **~14-36 hours of lead time over the projected threshold crossings — 24-48 hours
before the real CAQM order of 13 Dec 2025**, which came only after AQI had already
crossed 450.

Everything runs with **zero API keys** (physically-grounded simulator + deterministic
rule fallbacks + in-memory database fallback), and every panel carries a provenance
badge (**LIVE / CACHED / HISTORICAL REPLAY / SIMULATED / MODELLED**) so nothing is
silently faked. Headline verified figures: **57 pytest tests green · 8 cities ·
25 curated stations · 6 languages (incl. English) · 2 real tool-calling agents ·
official data.gov.in CPCB feed live (3,500 records, 500+ CAAQMS stations published)**.

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full system diagram.

## 3. The Ten Shipped Capabilities

Each subsection names the implementing file so judges can verify directly.

### 3.1 Forecast-Triggered GRAP Automation Engine — `backend/services/grap.py`

A rules layer over the forecaster using the official CAQM stage thresholds
(**Stage I 201-300 · II 301-400 · III 401-450 · IV >450**). The trigger is the
earliest *sustained* (≥3h) threshold crossing detected by any of three fully
transparent signals — **observed** (already crossed), the **XGBoost model forecast**,
or a **persistence-with-trend projection** — and the drafted order records **which
signal fired** (never a black box). It auto-generates a CAQM-style invocation order
carrying the **real statutory action checklist** (Stage III: BS-III petrol / BS-IV
diesel ban, C&D halt, classes ≤V hybrid; Stage IV: non-essential truck entry ban,
total C&D ban, classes VI-IX and XI online), each action tagged to a responsible
agency, plus the **lead-time gained** versus the projected crossing. GRAP legally
applies to Delhi-NCR; for other cities the same engine runs as a "graded response
recommendation" modelled on GRAP and is labelled accordingly.
Endpoints: `GET /api/v1/grap/status`, `GET /api/v1/grap/schedule`.

### 3.2 Direct Multi-Horizon Forecaster + Exact TreeSHAP — `backend/services/prediction.py`, `backend/ml/train_model.py`, `backend/ml/backtest.py`

One XGBoost model **per horizon** (6/12/24/48/72h), each predicting that horizon
*directly* and interpolated into the hourly curve. This **replaced an earlier
recursive scheme that compounded its own error — backtesting showed it actually lost
to naive persistence**, so it was rebuilt (a technical-rigor point: we measured,
found the flaw, and fixed the architecture rather than shipping the number).
Measured on a chronological 14-day holdout against the naive persistence baseline
("AQI in Nh = AQI now") — the exact comparison the problem statement's evaluation
focus names — with the artifact committed at `ml/saved_models/backtest_results.json`:

| Horizon | Model RMSE | Persistence RMSE | Improvement |
|---|---|---|---|
| 24h | **13.83** | 19.00 | **+27.2%** |
| 48h | **13.76** | 19.22 | **+28.4%** |
| 72h | **13.78** | 18.78 | **+26.6%** |

19 engineered features (current AQI + 5 lags, 4 rolling statistics, 5 weather
variables, 4 temporal encodings) built with pandas `shift`/`rolling` on
chronologically-ordered per-station series — no random draws, no future leakage.
Every forecast ships an **exact TreeSHAP** explanation via XGBoost's native
`pred_contribs` (no external `shap` dependency): *"forecast +38 AQI: 24h-ago AQI +14,
low wind +9, current PM2.5 +11."* A statistical fallback forecaster
(mean-reversion + diurnal cycle + compounding uncertainty) means the endpoint never
hard-fails. Retraining/backtesting are reproducible offline commands
(`python -m backend.ml.train_model`, `python -m backend.ml.backtest`).

### 3.3 CPF Source Attribution with Real Confidence — `backend/services/attribution.py`

**CPF (Conditional Probability Function) wind-sector probabilities** — the
peer-reviewed receptor-modelling diagnostic from the openair project — form the
statistical confidence backbone, rendered as a polar **pollution rose**. Priors are
calibrated to **published Delhi winter PMF source-apportionment splits** (IIT-K/DPCC
lineage); likelihoods come from measured station chemistry (NO2/CO vehicular, SO2
industrial, PM10/PM2.5 ratio for construction dust, PM2.5 + fire detections for
biomass) standardized against CPCB norms so the method stays scale-robust from
monsoon to Severe+. Live covariates are **NASA FIRMS fire detections and TomTom
congestion**; **every covariate carries an explicit source label** (`live:` /
`measured:` / `catalog:` / `modelled:`) and the response exposes a real `confidence`
field. This replaced a prior version that fed `random.seed()` covariates into
"evidence" — a credibility bomb, now removed, with **a regression test that fails if
`random` ever re-enters the module**. Zero random inputs.
Endpoints: `GET /api/v1/attribution/sources`, `/attribution/evidence`.

### 3.4 HYSPLIT-lite Back-Trajectories × Fire Fusion — `backend/services/trajectory.py`

A 2D kinematic back-trajectory that integrates the air parcel backward hour-by-hour
through the boundary-layer transport wind, then intersects the traced corridor with
fire detections — turning "biomass burning is a source" into visual, causal
provenance: *"this air mass crossed 10 active Punjab/Haryana fires within 17 hours —
570 km traced"* — animated on the map. Limitations are stated in the API response
and on-screen: 2D only, no mixing-height dynamics; a screening/corroboration tool,
not a dispersion model. In replay mode it uses the episode's archived fire points and
wind regime, so the demo has zero external dependencies.
Endpoint: `GET /api/v1/trajectory/back`.

### 3.5 Health & Exposure Impact Engine — `backend/services/health_impact.py`

Three cited lenses, pure arithmetic over published coefficients — nothing invented:

- **AQLI life-years lost** (EPIC/UChicago): 0.098 life-years per µg/m³ of PM2.5 above
  the WHO guideline of 5 µg/m³ — applied to an **annual-equivalent concentration
  capped at 130 µg/m³** (≈12.3 years, consistent with AQLI's published Delhi figure
  of ~11.9), because AQLI is an annual metric and feeding a Severe+ hourly peak in
  raw would produce absurd numbers.
- **WHO AirQ+ short-term mortality**: relative risk 1.08 per 10 µg/m³ PM2.5 through
  the log-linear concentration-response function, **capped at its validated range of
  150 µg/m³ — no extrapolation to episode peaks** — applied to India's baseline crude
  death rate of 7.3 per 1,000 per year.
- **Population-weighted exposure**: per-station served-population catchments; Delhi's
  curated stations cover **~4.78M people**.

The output turns concentrations into decision language — "protects 4.78M people,
averts ~13 deaths/day" — and **every coefficient is labelled on-screen with its
source**. Endpoints: `GET /api/v1/health-impact/city`, `/health-impact/action`.

### 3.6 Dec 2025 Crisis Replay — `backend/services/replay.py`, `backend/data/episodes/`

A one-click, honestly-labelled **HISTORICAL REPLAY** of the 13-16 Dec 2025 Delhi
Severe+ episode, calibrated to the real reported station peaks (**Anand Vihar 644,
Wazirpur 635, Mundka 560, Mandir Marg 519**), with the build-up from 11 Dec included
so the forecast-first story can play out. It is wired through **every** service via
an `at` timestamp (`?at=<ISO>` puts the whole platform — map, forecasts,
attribution, GRAP, enforcement, advisories — into that historical moment). This
solves the monsoon-demo problem (Delhi air is genuinely clean in July) and lets the
full crisis unfold in about a minute of video. Replay readings carry
`source="replay:<episode_id>"`, the HISTORICAL REPLAY banner stays up throughout,
and replay runs are **ephemeral — they never pollute live collections (a pytest
enforces this)**. Endpoints: `GET /api/v1/replay/episodes`,
`POST /api/v1/replay/episodes/{id}/seed`.

### 3.7 Incident War Room — `frontend/src/pages/WarRoom.jsx`

One orchestrated view that runs the full pipeline for the worst station and presents
it as a six-step timeline — Signal detected → Source attributed → Cause traced →
Response drafted → Impact quantified → Citizens alerted — with a real wall-clock
**"signal → drafted intervention" counter** displayed beside the documented
government benchmark: **>24 hours** (Delhi, 10-11 Nov 2025, cited on-screen). The
contrast — seconds versus more than a day — is the product thesis in one screen.

### 3.8 Voice / IVR Citizen Channel — `frontend/src/hooks/useSpeech.js`, `frontend/src/components/panels/IVRPreview.jsx`

Browser-native text-to-speech in `hi-IN` / `ta-IN` / `bn-IN` / `te-IN` / `kn-IN` —
zero backend, zero quota — plus a phone-frame IVR preview and WhatsApp-style mock
(no live telephony by design; the roadmap item is honest). Context: CPCB's own
SAMEER app is English-only, while most new Indian internet users prefer regional
languages. Advisories themselves are generated in 6 languages (incl. English) by the
advisory layer (§3.10).

### 3.9 Official data.gov.in CPCB Feed Adapter — `backend/services/gov_feed.py`

A live adapter for the Government of India real-time CAAQMS resource on data.gov.in
(resource `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`) — the same national feed CPCB's
SAMEER app draws on. Verified live: **3,500 records reachable, 500+ CAAQMS stations
published nationwide**. This is the scalability claim demonstrated rather than
asserted: the platform already speaks the official government data format, so
**onboarding a city is a config entry, not an integration project**. Fully
defensive: timeout + graceful fallback; the platform runs perfectly with the feed
unreachable. Endpoints: `GET /api/v1/data/gov-feed`, `/data/gov-feed/coverage`.

### 3.10 Tool-Calling Agents + Compliance RAG — `backend/services/agents.py`, `backend/services/rag.py`, `backend/services/llm_cache.py`

Two genuine LangChain agents built on `ChatGoogleGenerativeAI.bind_tools()` with a
minimal ReAct-style tool-calling loop (deliberately on stable `langchain-core`
primitives, not the version-churning `langchain.agents` surface):

- **Compound-Risk Enforcement Agent** — given a rule-detected breach, it
  independently calls tools for source attribution, the station's forecast trend,
  and regulatory RAG context before returning a structured verdict
  (`compound_risk`, `confidence`, `rationale`, `regulatory_basis`,
  `recommended_escalation`). This implements the problem statement's compound-risk
  concept: correlating signals no single sensor would flag alone.
- **Citizen Advisory Agent** — decides for itself whether to look up nearby
  hospitals/schools/outdoor-worker zones (only when conditions warrant) and names
  specific at-risk locations in guidance generated across 6 languages.

The compliance RAG chunks NAAQS/NCAP/AQI-calculation documents into ChromaDB (with a
hand-rolled TF-IDF cosine-similarity fallback if ChromaDB/SQLite fails), answers
with source citations, and says honestly when an answer is not in the corpus. All
LLM paths are **cached-first** (`llm_cache.py`: Mongo-backed with a JSON-file
fallback) so a live demo never stalls on a rate limit, and every AI path has a
deterministic fallback — **the app runs with zero API keys**.
Endpoints: `POST /api/v1/chat/query`, `POST /api/v1/enforcement/actions/{id}/analyze`,
`GET /api/v1/advisory/citizen`.

### 3.11 Provenance Badges Everywhere — `frontend/src/components/common/ProvenanceBadge.jsx`, `ReplayBanner.jsx`

Every data panel carries a badge: **LIVE / CACHED / HISTORICAL REPLAY / SIMULATED /
MODELLED**. The fallback architecture is presented as what it is — full data
provenance — rather than hidden. This property is load-bearing for judging: nothing
on screen pretends to be something it is not.

## 4. Technical Foundations

- **Data layer** (`backend/services/data_ingestion.py`): live AQI from AQICN (with an
  OpenWeatherMap fallback) and weather from Open-Meteo (keyless), Indian NAQI
  computed from CPCB sub-index breakpoint tables, falling back to a
  physically-grounded simulator (diurnal traffic peaks, overnight temperature
  inversion, city/station-specific profiles, monsoon washout) when live data or keys
  are unavailable. A hardened detail: AQICN's `iaqi.*.v` values are 0-500 AQI
  sub-indices, **not** µg/m³ — an earlier version fed them straight into
  concentration math; this is now corrected via explicit sub-index-to-concentration
  inversion, covered by a regression test.
- **Scheduler** (`backend/services/scheduler.py`, APScheduler): hourly live
  ingestion, enforcement anomaly scan every ~65 minutes.
- **Database** (`backend/models/database.py`): MongoDB via Motor with a transparent
  full in-memory mock fallback (`$in`/`$gte`/`$lte`, sort, upsert, indexes) — the
  entire API keeps working with zero real database.
- **Testing**: **57 pytest tests, green** — including regression tests for the
  response-serialization bug class, the no-`random`-in-attribution guarantee, and
  replay ephemerality.
- **API**: everything under `/api/v1`, live Swagger at `/docs`; every external call
  has a timeout + documented fallback; `?at=<ISO>` threads historical replay through
  the entire platform.

## 5. Judging-Criteria & Evaluation-Focus Mapping

### 5.1 Hackathon judging criteria

| Criterion | Weight | What earns it — feature + measured number |
|---|---|---|
| **Innovation** | 25% | Forecast-triggered GRAP automation (automating a policy the government wrote but executes reactively — 13/17) · CPF wind-sector confidence · HYSPLIT-lite trajectory×fire fusion · replay-through-every-service `at` architecture — mechanisms a map-and-chatbot submission won't ship |
| **Business Impact** | 25% | Named buyer (CAQM / 131 NCAP cities) · documented failure we fix (13/17 reactive; 10-11 Nov 2025 >24h lag) · money that already exists (₹11,211 cr NCAP released, ~68% used) · impact in lives (1.67M deaths/yr context; ~4.78M people covered by Delhi curated stations; ~13 deaths/day averted at episode scale) |
| **Technical Excellence** | 20% | Direct multi-horizon RMSE vs persistence: +27.2%/+28.4%/+26.6% at 24/48/72h (artifact committed) · exact TreeSHAP via `pred_contribs` · CPF statistics · zero-random attribution with regression guard · 57 tests · live Swagger |
| **Scalability** | 15% | Official data.gov.in CAAQMS feed demoed live (3,500 records, 500+ stations) · station-agnostic pooled model · city onboarding = config entry · agent cost scales with usage, not station count |
| **User Experience** | 15% | Incident War Room stepped flow with live counter · one-click Dec 2025 crisis replay · voice advisories in Indian languages · provenance badges · dark command-center UI |

### 5.2 Problem-statement evaluation focus

| PS evaluation focus | Our answer | Measured evidence |
|---|---|---|
| **Attribution accuracy** | CPF wind-sector probabilities (openair method) + PMF-calibrated priors + measured chemistry; real `confidence` field; corroborated by back-trajectory×fire fusion | Every covariate source-labelled; zero random inputs (pytest-enforced); live FIRMS + TomTom covariates |
| **Forecast RMSE vs persistence** | Direct multi-horizon XGBoost, chronological holdout | **24h 13.83 vs 19.00 (+27.2%) · 48h 13.76 vs 19.22 (+28.4%) · 72h 13.78 vs 18.78 (+26.6%)** — `backtest_results.json` |
| **Enforcement recommendation quality** | GRAP engine drafts the *statutory* CAQM action checklist with agency tags and lead time; Compound-Risk Agent adds tool-verified cross-signal verdicts with regulatory citations | Order records which trigger signal fired; ≥3h sustain rule prevents blip-triggering; deterministic rule fallback always available |
| **Advisory relevance + language coverage** | Agent-generated advisories naming specific nearby vulnerable locations; **6 languages incl. English**; browser TTS voice in hi/ta/bn/te/kn; IVR/WhatsApp preview | SAMEER (the incumbent) is English-only |
| **Signal → intervention response-time reduction** | War Room wall-clock counter: full pipeline signal→drafted intervention in **seconds**, against the documented **>24h** government lag (10-11 Nov 2025) | In the Dec 2025 replay: orders drafted ~14-36h before projected crossings, 24-48h before the real 13 Dec CAQM order |

## 6. Business Impact & Procurement (in rupees)

- **Cost of the problem:** ~$95B/yr — about **3% of GDP** (Dalberg/CII) — and
  **1.67M deaths/yr** (Lancet).
- **The budget already exists:** NCAP has **₹11,211 crore released with only ~68%
  utilised** (CREA analysis); **Delhi has used ~20%** of its allocation. The
  performance-linked funding of the **131 non-attainment cities** is money waiting
  for exactly this capability — an early-warning-plus-response layer that cities can
  procure with funds they already hold but demonstrably struggle to spend.
- **Procurement precedent:** a state government already pays for this class of
  product — **DPCC pays IIT-Kanpur crores for real-time source apportionment** in
  Delhi. VayuDrishti generalises that single-city, bespoke arrangement into a
  configurable platform any NCAP city can onboard as a config entry.
- **Policy alignment:** the pilot is framed as **NCAP-fundable and aligned with
  CAQM's own forecast-based invocation policy and the January 2026 Supreme Court
  directive** on air-quality response. (We describe alignment with published policy
  and court directions — we do not claim or imply any endorsement.)
- **Who buys, concretely:** CAQM and state pollution control boards (forecast-
  triggered GRAP drafting + evidence packs), municipal corporations and Smart City
  SPVs (war-room operations + citizen channel), and NCAP city administrations
  (early-warning capability that only 8 of 131 cities currently have in any form).

## 7. Positioning vs Incumbents

| Incumbent | Coverage / status | Where VayuDrishti differs |
|---|---|---|
| **SAFAR** (IITM) | ~7 metros | Forecast display, not forecast-triggered statutory response; no attribution evidence chain |
| **IITM-DSS** | Delhi only; runs on a **2021 emissions inventory**; **suspended by CAQM** over reliability concerns | We show per-signal transparent triggers, provenance labels, and honest confidence instead of an opaque model that lost its customer's trust |
| **SAMEER app** (CPCB) | National AQI display, **English-only** | 6 languages, voice-first citizen channel, advisories that name nearby vulnerable locations |
| **Early-warning coverage** | Only **8 of 131** NCAP cities have any early-warning system | Config-entry onboarding against the official data.gov.in feed the government already publishes |
| **Microsoft Aurora** (Nature, 2025) | Global AI air-quality forecasting at **44 km** resolution | Validates AI-for-air-quality at the frontier — VayuDrishti operates at the **ward/station scale where interventions actually happen**, and closes the loop to statutory action, not just prediction |

## 8. Scalability Analysis

- **Adding a city** is a `stations.json` entry plus one coordinates entry — no
  router, service, or frontend code changes; every layer keys off `city` as a plain
  string. The live data.gov.in adapter (§3.9) proves the platform already speaks the
  official national data format covering 500+ published stations.
- **The ML model is station-agnostic and pooled** across cities; onboarding stations
  does not require per-station retraining.
- **MongoDB is indexed** on `(station_id, timestamp)` and `city`; the schema is
  unchanged going from the 8-city / 25-station demo to the full national network.
- **Agent cost scales with usage, not station count** — compound-risk analysis and
  advisory generation are on-demand or scheduled, and the cached-first LLM layer
  (§3.10) means repeated queries cost zero quota.

## 9. Data Sources & Licensing

| Source | Data | License / terms | Usage & attribution |
|---|---|---|---|
| **data.gov.in** (CPCB CAAQMS resource `3b01bcb8-…`) | Official real-time station AQI, 500+ stations | **Government Open Data License – India (GODL)** | Live adapter (`gov_feed.py`); attribution to data.gov.in/CPCB in-app |
| **AQICN / WAQI** | Real-time station AQI & pollutant sub-indices | **Attribution required** per WAQI terms | Live fetch with sub-index→concentration correction; attributed in-app |
| **Open-Meteo** | Temperature, humidity, wind, precipitation | **CC-BY** | Keyless live API; attributed in-app |
| **NASA FIRMS** | Active fire / thermal-anomaly detections | **Open** (NASA open data) | Biomass-burning covariate + trajectory fusion; attributed in-app |
| **TomTom** | Real-time traffic congestion | **API Terms of Service** (developer key) | Vehicular covariate in attribution |
| **Google Gemini** (`gemini-flash-latest`) | LLM reasoning (agents, RAG, advisories) | API Terms of Service | Cached-first; deterministic fallback keeps the app key-free |
| **CPCB NAAQS / NCAP / AQI-calculation documents** | Regulatory corpus for RAG | Public government documents | Chunked into ChromaDB; answers cite sources |

**Official migration path:** the AQICN aggregation layer is a development bridge.
The production path — already implemented and demonstrated live via `gov_feed.py` —
is the official data.gov.in CAAQMS feed under GODL, upgradeable to a direct CPCB
data partnership. Population weighting currently uses curated per-station catchment
estimates; the stated production upgrade is the WorldPop 1 km raster.

## 10. Honesty & Provenance

This section exists because judges should know exactly what is real:

- **Live paths are real:** AQICN, Open-Meteo, NASA FIRMS, TomTom, and the official
  data.gov.in CPCB feed are genuine integrations with timeouts and fallbacks.
- **The simulator is physically grounded** (diurnal traffic, overnight inversion,
  per-city/station profiles, weather correlation) and **labelled SIMULATED**
  wherever shown. With zero keys the platform runs entirely on it — by design.
- **The Dec 2025 replay is a labelled reconstruction**, calibrated to the real
  reported station peaks (Anand Vihar 644, Wazirpur 635, Mundka 560, Mandir Marg
  519) — never presented as raw archived CPCB data. The episode file carries an
  explicit `honesty_note`; the UI shows a persistent HISTORICAL REPLAY banner;
  replay data is ephemeral and pytest-enforced never to leak into live collections.
- **Health and attribution numbers are arithmetic over cited coefficients**, every
  constant labelled with its source on-screen. Concentration-response functions are
  **capped at their validated ranges** (AQLI annual-equivalent capped at 130 µg/m³;
  WHO AirQ+ CRF capped at 150 µg/m³ — no extrapolation to episode peaks).
- **Forecast evaluation is honest about its data:** the backtest artifact records
  its evaluation series source (physically-grounded simulator, chronological 14-day
  holdout, models frozen — evaluation only, no retraining). The recursive-forecaster
  failure was found by this same backtest and fixed, not hidden.
- **Provenance badges** (LIVE / CACHED / HISTORICAL REPLAY / SIMULATED / MODELLED)
  appear on every data panel.
- **No live telephony** in the voice/IVR channel — browser TTS plus a phone-frame
  preview, stated as such.

## 11. Future Roadmap

- Batch pre-generation of LLM outputs across demo scenarios once fresh quota/paid
  key is available (the cached-first layer already supports it).
- Direct CPCB CAAQMS data partnership; WorldPop raster for population weighting.
- SMS/IVR delivery via a telephony provider for reach beyond smartphone users.
- Extend the enforcement agent's tool set to real permit-to-work and industrial
  compliance databases as they become available.
- Extend attribution from CPF/PMF-prior fusion toward a learned model when labelled
  ground-truth apportionment data exists for more cities.

## 12. Team

- **Team Name:** [Your Team Name]
- **Members:** [Name 1 — role], [Name 2 — role], [Name 3 — role], [Name 4 — role]
- **Competition:** Economic Times AI Hackathon 2026, Phase 2
- **Repository:** [GitHub URL]

## 13. References

- CAQM — revised GRAP schedule and stage invocation orders (caqm.nic.in)
- ThePrint / CEEW — analysis of reactive GRAP invocations, winter 2025-26
- The Lancet — air pollution mortality estimates for India (1.67M deaths/yr)
- Dalberg / CII — economic cost of air pollution (~$95B/yr, ~3% of GDP)
- CREA — NCAP fund utilisation analysis (₹11,211 cr released, ~68% used)
- EPIC / University of Chicago — Air Quality Life Index (AQLI) methodology
- WHO — AirQ+ tool and short-term PM2.5 concentration-response functions
- openair project — CPF (Conditional Probability Function) methodology
- Published Delhi winter PMF source-apportionment studies (IIT-K/DPCC lineage)
- Microsoft Aurora — Nature (2025), s41586-025-09005-y
- data.gov.in — real-time CAAQMS resource, Government Open Data License – India
- CPCB — National Ambient Air Quality Standards (NAAQS), NCAP guidelines
- Supreme Court of India — January 2026 directive on air-quality response
