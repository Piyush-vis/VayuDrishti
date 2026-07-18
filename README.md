# VayuDrishti (वायुदृष्टि) — Urban Air Quality Intelligence Platform

> **From reactive monitoring to forecast-triggered intervention.** VayuDrishti
> forecasts an air-quality crisis, drafts the *statutory* response before it
> lands, proves the cause with agency-grade evidence, and quantifies the human
> stakes — for India's 131 NCAP non-attainment cities.

**ET AI Hackathon 2026 · Problem Statement 5 (Urban Air Quality Intelligence)**

| | |
|---|---|
| **Forecast skill (RMSE vs persistence)** | **24h +27.2% · 48h +28.4% · 72h +26.6%** (direct multi-horizon XGBoost, chronological holdout) |
| **Attribution** | CPF wind-sector confidence (openair method) + PMF-calibrated priors — every covariate source-labelled, **zero random inputs** |
| **Enforcement** | Forecast-triggered **GRAP** engine drafts CAQM-stage invocation orders **before** thresholds are crossed |
| **Scale (live)** | Ingests the official **data.gov.in CPCB feed** — 3,500 records live, **500+ CAAQMS stations** nationwide |
| **Coverage** | 8 cities · 25 curated stations · **6 languages** (incl. English) · **2** real tool-calling agents |
| **Tests** | **57 pytest**, green · works with **zero API keys** (simulator + rules fallbacks) |

---

## The problem, and the gap we close

Air pollution kills ~1.67M Indians a year (Lancet) and costs ~3% of GDP
(Dalberg/CII). India already has the policy instrument to respond — the
**Graded Response Action Plan (GRAP)**, whose stages CAQM's own rules say
"shall be invoked **in advance**" based on forecasts. Yet **13 of 17 GRAP
invocations in winter 2025-26 were reactive** (ThePrint/CEEW): on 10 Nov 2025
Delhi hit AQI 362; GRAP-III came only on 11 Nov at 425+.

**VayuDrishti automates a policy the government already wrote but fails to
execute on time.** Every feature is a link in one chain — the demo's spine and
the war-room flow:

```
Forecast sees the crisis coming (24-72h, RMSE-beats-persistence)
   → GRAP engine drafts the Stage III/IV order 24-48h BEFORE the government acted
      → evidence: CPF source attribution + back-trajectories over Punjab fires
         → human impact: people exposed, life-years lost, deaths averted
            → citizens hear it in their language (voice advisory)
               → counter: signal → intervention in seconds vs the >24h govt lag
```

---

## Key capabilities (each maps to a Problem-Statement requirement)

**1 · Forecast-Triggered GRAP Automation** — `services/grap.py`
Rules layer over the forecaster using the official CAQM thresholds
(Stage I 201-300, II 301-400, III 401-450, IV >450). The trigger is the earliest
*sustained* (≥3h) threshold crossing by **either** the XGBoost forecast **or** a
persistence-with-trend projection — and the drafted order records **which signal
fired** (never a black box). It auto-generates a CAQM-style invocation order with
the **real statutory action checklist** (Stage III: BS-III petrol / BS-IV diesel
ban, C&D halt, classes ≤V hybrid; Stage IV: non-essential truck ban, total C&D
ban, classes VI-IX+XI online), each action tagged to a responsible agency, plus
the **lead-time gained** vs the crossing.

**2 · Direct Multi-Horizon Forecaster + SHAP** — `services/prediction.py`, `ml/`
One XGBoost model **per horizon** (6/12/24/48/72h), each predicting that horizon
*directly* and interpolated into the hourly curve — replacing a broken recursive
scheme that compounded error. Backtest vs a naive persistence baseline
(`ml/backtest.py`, artifact committed): **+27.2% / +28.4% / +26.6%** at
24/48/72h. Every forecast ships an **exact TreeSHAP** waterfall (XGBoost
`pred_contribs`, no extra dependency): "forecast +38 AQI: 24h-ago AQI +14, low
wind +9, current PM2.5 +11."

**3 · Source Attribution with Real Confidence** — `services/attribution.py`
**CPF (Conditional Probability Function)** wind-sector probabilities — the
peer-reviewed openair receptor-modelling diagnostic — as the statistical
confidence backbone, rendered as a polar **pollution rose**. Priors calibrated to
published Delhi PMF splits; likelihoods from measured station chemistry
standardized against CPCB norms (scale-robust from monsoon to Severe+). Live
covariates are NASA FIRMS + TomTom; **every covariate carries a source label**
(`live:` / `measured:` / `catalog:` / `modelled:`), and there is a real
`confidence` field. (This replaced a prior version that fed `random.seed()`
covariates into "evidence" — a credibility bomb, now removed with a regression
test that fails if `random` ever re-enters the module.)

**4 · HYSPLIT-lite Back-Trajectories × Fire Fusion** — `services/trajectory.py`
2D kinematic back-trajectory that integrates the air parcel backward through the
boundary-layer transport wind and intersects its corridor with fire detections:
*"this air mass passed over 10 active Punjab/Haryana fires within 17h before
reaching the station"* — animated on the map. Honest limitations stated (2D, no
mixing-height dynamics; a corroboration tool, not a dispersion model).

**5 · Health & Exposure Impact Engine** — `services/health_impact.py`
Three cited lenses, pure arithmetic: **AQLI** life-years lost (EPIC/UChicago),
**WHO AirQ+** short-term excess deaths (log-linear CRF, capped at its validated
range — no extrapolation to peaks), and **population-weighted exposure**. Turns
concentrations into "protects 4.78M people, averts ~13 deaths/day." Every
coefficient is labelled on-screen with its source.

**6 · Dec 2025 Crisis Replay** — `services/replay.py`, `data/episodes/`
A one-click, honestly-labelled **HISTORICAL REPLAY** of the 13-16 Dec 2025 Delhi
Severe+ episode (calibrated to real headline peaks: Anand Vihar 644, Wazirpur
635, Mundka 560, Mandir Marg 519) wired through **every** service via an `at`
timestamp. Solves the monsoon-demo problem (Delhi air is clean in July) and lets
the whole crisis unfold in 60 seconds of video. Replay runs are ephemeral — they
never pollute live collections (pytest enforces this).

**7 · Incident War Room** — `pages/WarRoom.jsx`
One orchestrated view that runs the full pipeline for the worst station and shows
it as a stepped timeline with a real wall-clock **"signal → drafted intervention"
counter**, contrasted with the documented **>24h** government lag.

**8 · Voice / IVR Citizen Channel** — `hooks/useSpeech.js`, `IVRPreview.jsx`
Browser-native TTS (`hi-IN`/`ta-IN`/`bn-IN`/`te-IN`/`kn-IN`) — zero backend, zero
quota — plus a phone-frame IVR + WhatsApp mock. (No live telephony by design.)
CPCB's own SAMEER app is English-only; most new Indian internet users prefer
regional languages.

**9 · Official CPCB Feed (data.gov.in)** — `services/gov_feed.py`
Live adapter for the Government of India CAAQMS resource — the scalability claim
shown, not asserted: **onboarding a city is a config entry, not an integration.**

**10 · Tool-Calling Agents + Compliance RAG** — `services/agents.py`, `services/rag.py`
Two genuine LangChain `bind_tools()` agents: the **Compound-Risk Enforcement
Agent** independently pulls attribution + forecast-trend + regulatory context
before judging a breach; the **Citizen Advisory Agent** looks up vulnerable
locations for severe conditions. RAG over CPCB docs (ChromaDB + TF-IDF fallback),
**cached-first** so the demo never stalls on a rate limit. Every AI path has a
deterministic fallback — **the app runs with zero API keys.**

**Provenance everywhere.** Every data panel carries a badge: **LIVE / CACHED /
HISTORICAL REPLAY / SIMULATED / MODELLED**. Our fallback architecture is a
feature, not a liability: full data provenance.

---

## How it maps to the judging criteria

| Criterion | Weight | What earns it |
|---|---|---|
| **Innovation** | 25% | Forecast-triggered GRAP automation · CPF confidence · HYSPLIT-lite trajectory×fire fusion — mechanisms a map-and-chatbot won't ship |
| **Business Impact** | 25% | Named buyer (CAQM / 131 NCAP cities) · documented failure we fix (13/17 reactive) · money that exists (₹11,211 cr NCAP, ~68% used) · impact in lives & life-years |
| **Technical Excellence** | 20% | Direct multi-horizon RMSE vs persistence (24/48/72h) · exact TreeSHAP · CPF · provenance badges · 57 tests · live Swagger |
| **Scalability** | 15% | Official data.gov.in feed demoed live (500+ stations) · station-agnostic pooled model · city = config entry |
| **User Experience** | 15% | War-room incident flow · replay drama · voice in Indian languages · dark command-center UI |

Full evaluation-focus mapping (attribution accuracy, forecast RMSE, enforcement
quality, advisory relevance/language coverage, signal→intervention time) is in
[`docs/DETAILED_DOCUMENT.md`](docs/DETAILED_DOCUMENT.md).

---

## Business case (in rupees)

- **Problem cost:** ~$95B/yr (≈3% of GDP), 1.67M deaths/yr.
- **Buyer & budget that already exist:** 131 NCAP non-attainment cities with
  performance-linked funding; **₹11,211 cr released, ~68% utilised** (CREA),
  Delhi ~20% — money waiting for exactly this capability. A state government
  already pays IIT-Kanpur crores for real-time source apportionment (DPCC); we
  generalise it.
- **Positioning:** SAFAR covers ~7 metros; IITM-DSS covers Delhi only, ran a
  2021 inventory and was suspended by CAQM over reliability; only 8 of 131 NCAP
  cities have any early-warning system. Microsoft Aurora (Nature 2025) validates
  AI-for-air-quality at 44 km — VayuDrishti operates at the **ward scale where
  interventions actually happen.**
- **Framing:** an NCAP-fundable pilot aligned with CAQM policy and the Jan 2026
  Supreme Court directive. (We describe alignment, not endorsement.)

---

## Architecture

```
DATA         AQICN · Open-Meteo · NASA FIRMS · TomTom · data.gov.in CPCB feed
             → Ingestion + physically-grounded simulator → MongoDB (+ in-memory mock fallback)
             → CPCB docs → ChromaDB / TF-IDF RAG

INTELLIGENCE Forecaster (direct multi-horizon XGBoost + TreeSHAP)
             Attribution (CPF wind-sector + PMF priors + FIRMS/TomTom)
             Back-trajectory engine (2D kinematic × fire fusion)
             GRAP engine (CAQM thresholds → statutory order + lead time)
             Health engine (AQLI · WHO AirQ+ · population exposure)
             Agents (LangChain bind_tools) + LLM cache (quota-resilient)
             Replay context (`at`) threaded through EVERY service

PRESENTATION React 18 + Vite + Tailwind + Leaflet + Recharts
             Command Center · Incident War Room · 72h Predictions ·
             Enforcement (GRAP + actions) · Citizen Portal (voice/IVR) · City Analytics
             Provenance badges on every panel
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full trace of a compound-risk detection.

---

## Quick start

**Docker (canonical):**
```bash
docker-compose up --build     # frontend :5173 · backend :8000 (/docs) · mongo :27017
```
Runs with **zero API keys** (simulator + rules). First boot seeds 7 days of
history *and* the Dec 2025 replay episode, so charts and the crisis demo are
populated instantly.

**Manual dev** — backend launches from the **repo root** (absolute `backend.` imports):
```bash
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
# second terminal:
cd frontend && npm install && npm run dev
```

**Retrain / backtest / tests (offline):**
```bash
python -m backend.ml.train_model     # direct multi-horizon models
python -m backend.ml.backtest        # writes backtest_results.json (RMSE vs persistence)
python -m pytest backend/tests/ -q   # 57 tests
```

**Demo tip:** open the sidebar **Scenario → "Dec 2025 Delhi Severe+ Crisis"**,
then visit the **Incident War Room**. Everything re-scopes to the historical
crisis; the HISTORICAL REPLAY banner stays up the whole time.

---

## API (all under `/api/v1`, live Swagger at `/docs`)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/aqi/current` · `/aqi/at` · `/aqi/heatmap` · `/aqi/compare` | Readings, timelapse, map, multi-city (all `?at=` replay-aware) |
| GET | `/predict/forecast` · `/predict/explain` · `/predict/alerts` | Multi-horizon forecast · TreeSHAP · threshold alerts |
| GET | `/attribution/sources` · `/attribution/evidence` | CPF attribution + confidence + wind rose |
| GET | `/grap/status` · `/grap/schedule` | Forecast-triggered GRAP evaluation + draft order |
| GET | `/trajectory/back` | Back-trajectory + fire intersections |
| GET | `/health-impact/city` · `/health-impact/action` | AQLI / WHO / exposure lenses |
| GET | `/replay/episodes` · POST `/replay/episodes/{id}/seed` | Scenario switcher |
| GET | `/advisory/citizen` · `/enforcement/actions` · POST `/enforcement/actions/{id}/analyze` | Advisories · ranked actions · agent analysis |
| GET | `/data/gov-feed` · `/data/gov-feed/coverage` | Official CPCB feed adapter |
| POST | `/chat/query` | Compliance RAG (cached-first) |

Every external call has a timeout + fallback; **`?at=<ISO>` puts the whole
platform into historical replay.**

---

## Honesty notes (what is real vs. modelled)

- **Live paths are real:** AQICN, Open-Meteo, NASA FIRMS, TomTom, the official
  data.gov.in CPCB feed.
- **The simulator is physically grounded** (diurnal traffic, overnight
  inversion, per-city/station profiles, weather correlation) and **labelled
  SIMULATED** wherever shown. With zero keys the platform runs entirely on it.
- **The Dec 2025 replay is a labelled reconstruction** calibrated to real
  reported station peaks — never presented as raw archived data.
- **Health & attribution numbers are arithmetic over cited coefficients**, with
  every constant and its source shown; concentration-response functions are
  **capped at their validated ranges**.
- Data licensing per source (and the official migration path) is documented in
  [`docs/DETAILED_DOCUMENT.md`](docs/DETAILED_DOCUMENT.md).

---

## License

MIT — see [LICENSE](LICENSE). Third-party data under their respective licenses
(data.gov.in: Government Open Data License – India; Open-Meteo: CC-BY; NASA
FIRMS: open; AQICN: attribution required).
