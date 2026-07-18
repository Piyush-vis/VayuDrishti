# VayuDrishti — Presentation Deck Outline (12 slides)

> Ready-to-build slide content for Phase 3 (if selected as finalist). Paste each
> section into a slide; speaker notes are the indented quotes. Pair with demo
> segments where marked **[DEMO]** — run them against the Dec 2025 replay
> (sidebar: Scenario → "Dec 2025 Delhi Severe+ Crisis") so nothing depends on live
> API latency or July's clean monsoon air.

---

### Slide 1 — Title
**VayuDrishti (वायुदृष्टि)**
*From reactive monitoring to forecast-triggered intervention.*
Team [Your Team Name] · ET AI Hackathon 2026 · Problem Statement 5

---

### Slide 2 — The Hook: the policy exists, the execution doesn't
- **1.67 million Indians die every year** from air pollution (Lancet); cost **~$95B/yr, ~3% of GDP** (Dalberg/CII).
- India already wrote the response policy: **GRAP** — CAQM's rules say stages "shall be invoked **in advance**" based on forecasts.
- Reality: **13 of 17 GRAP invocations in winter 2025-26 were reactive** (ThePrint/CEEW).
- **10 Nov 2025:** Delhi hits AQI 362. **GRAP-III arrives 11 Nov — at 425+.** A full day late.

> Speaker note: land the reframe — this is not a dashboards problem, it's an
> execution-automation problem. We automate a policy the government already wrote.

---

### Slide 3 — One chain, one win
```
Forecast sees the crisis (24-72h, beats persistence at every horizon)
  → GRAP engine drafts the Stage III/IV statutory order BEFORE the crossing
    → evidence: CPF attribution + back-trajectories over Punjab fires
      → human impact: people exposed, life-years, deaths averted
        → citizens hear it in their language (voice)
          → counter: signal → intervention in SECONDS vs the >24h govt lag
```
- Ten shipped capabilities, every one a link in this chain.
- **57 pytest green · 8 cities · 25 stations · 6 languages · 2 tool-calling agents · runs with zero API keys.**

---

### Slide 4 — Forecast-Triggered GRAP Automation (`services/grap.py`)
- Official CAQM thresholds: **I 201-300 · II 301-400 · III 401-450 · IV >450**.
- Trigger = earliest **sustained (≥3h)** crossing by observed AQI, the XGBoost forecast, **or** a persistence-with-trend projection — the drafted order **records which signal fired**. Never a black box.
- Auto-drafts the CAQM-style order with the **real statutory checklist** (Stage III: BS-III petrol / BS-IV diesel ban, C&D halt; Stage IV: truck ban, total C&D ban, classes online), each action tagged to its agency, **plus lead-time gained**.

**[DEMO]** GRAP panel in replay: Stage IV drafted while the city index is still climbing.

---

### Slide 5 — Forecasting, evaluated the honest way (`services/prediction.py`, `ml/`)
- **Direct multi-horizon XGBoost** — one model per horizon (6/12/24/48/72h), chronological holdout, vs naive persistence (the PS's named baseline):

| Horizon | Model RMSE | Persistence | Gain |
|---|---|---|---|
| 24h | **13.83** | 19.00 | **+27.2%** |
| 48h | **13.76** | 19.22 | **+28.4%** |
| 72h | **13.78** | 18.78 | **+26.6%** |

- Technical-rigor story: our first recursive forecaster **lost to persistence** in backtest — we found it, rebuilt it, committed the artifact (`backtest_results.json`).
- Every forecast ships **exact TreeSHAP** (XGBoost `pred_contribs`): "+38 AQI: 24h-ago AQI +14, low wind +9, PM2.5 +11."

---

### Slide 6 — Evidence, not vibes: attribution + trajectories
- **CPF (Conditional Probability Function)** wind-sector probabilities (openair method) + **PMF-calibrated priors** + measured station chemistry → real `confidence`, rendered as a **pollution rose**. Live covariates: NASA FIRMS + TomTom. **Zero random inputs** — a regression test fails if `random` re-enters the module. (`services/attribution.py`)
- **HYSPLIT-lite back-trajectory × fire fusion**: *"this air mass crossed 10 active Punjab/Haryana fires within 17h — 570 km traced"*, animated on the map, limitations stated on-screen. (`services/trajectory.py`)

**[DEMO]** Trajectory animation over the Punjab fire field + the CPF rose.

---

### Slide 7 — Human impact + citizen voice
- **Health engine** (`services/health_impact.py`): three cited lenses, pure arithmetic — AQLI life-years (0.098 yr/µg above WHO 5, capped), WHO AirQ+ excess deaths (RR 1.08/10µg, CRF capped at 150 — no extrapolation), population-weighted exposure (**~4.78M** across Delhi's curated stations). Output: "protects 4.78M people, averts ~13 deaths/day."
- **Voice/IVR channel** (`hooks/useSpeech.js`, `IVRPreview.jsx`): browser TTS in **hi/ta/bn/te/kn**, phone-frame IVR + WhatsApp mock, advisories in **6 languages**. CPCB's own SAMEER app is English-only.

**[DEMO]** Press "Dispatch voice advisory (हिंदी)" — the room hears it.

---

### Slide 8 — The Dec 2025 replay + Incident War Room
- One-click, honestly-labelled **HISTORICAL REPLAY** of 13-16 Dec 2025 Delhi Severe+ (real peaks: **Anand Vihar 644, Wazirpur 635, Mundka 560, Mandir Marg 519**) — threaded through **every** service via an `at` timestamp. (`services/replay.py`)
- **War Room** (`pages/WarRoom.jsx`): six-step pipeline — Signal → Attribution → Trace → Drafted response → Impact → Citizens alerted — with a wall-clock **signal→intervention counter in seconds**, next to the documented **>24h** government lag.
- In replay: orders drafted **~14-36h before projected crossings — 24-48h before the real 13 Dec CAQM order**.

**[DEMO]** This IS the demo — the full chain on one screen.

---

### Slide 9 — Scale is demonstrated, not asserted
- **Official data.gov.in CPCB feed live** (`services/gov_feed.py`): **3,500 records, 500+ CAAQMS stations** published nationwide — we already speak the government's own data format.
- New city = **a config entry, not an integration** · pooled station-agnostic model · agent cost scales with usage, not stations · cached-first LLM layer survives free-tier quotas.
- **Two real `bind_tools()` agents** + compliance RAG (ChromaDB + TF-IDF fallback) — every AI path has a deterministic fallback; the whole app runs with **zero API keys**.
- Provenance badges on every panel: **LIVE / CACHED / HISTORICAL REPLAY / SIMULATED / MODELLED**.

---

### Slide 10 — How we score (judging-criteria mapping)

| Criterion | Weight | What earns it |
|---|---|---|
| Innovation | 25% | Forecast-triggered GRAP automation · CPF confidence · trajectory×fire fusion · replay-through-every-service |
| Business Impact | 25% | Named buyer (CAQM / 131 NCAP cities) · documented failure fixed (13/17 reactive) · ₹11,211 cr NCAP money exists · impact in lives |
| Technical Excellence | 20% | RMSE vs persistence +27.2/+28.4/+26.6% · exact TreeSHAP · zero-random attribution · 57 tests |
| Scalability | 15% | data.gov.in feed live (500+ stations) · city = config entry · pooled model |
| User Experience | 15% | War Room flow · replay drama · voice in Indian languages · provenance badges |

PS evaluation focus → attribution accuracy (CPF + labels), forecast RMSE (above), enforcement quality (statutory checklists + agent verdicts), advisory relevance (6 languages + named locations), **response time (seconds vs >24h)**.

---

### Slide 11 — Business case, in rupees
- Problem: **~$95B/yr (~3% GDP)**, **1.67M deaths/yr**.
- The budget exists: **₹11,211 crore NCAP released, only ~68% utilised** (CREA); Delhi ~20% — performance-linked money in **131 cities** waiting for exactly this capability.
- Procurement precedent: **DPCC already pays IIT-Kanpur crores** for real-time source apportionment in one city — we generalise it to all 131 via config.
- Positioning: SAFAR ~7 metros · IITM-DSS Delhi-only, 2021 inventory, **suspended by CAQM** · only **8/131** NCAP cities have any early warning · Aurora (Nature 2025) validates AI-for-air at 44 km — we act at **ward scale**, where interventions happen.
- Framing: **NCAP-fundable pilot aligned with CAQM policy and the Jan 2026 Supreme Court directive** (alignment, not endorsement).

---

### Slide 12 — Close
**The government already wrote the playbook. VayuDrishti runs it on time.**
Forecast → statutory order → evidence → human impact → a citizen's own language — in seconds, not days.
GitHub: [repo URL] · Team: [Your Team Name]

---

## Notes on building this in slides

- Use the color palette and AQI category colors from
  `frontend/src/utils/aqiColors.js` / `constants.js` for visual consistency with the
  live product.
- For an architecture slide (optional 5-second flash), render `ARCHITECTURE.md`'s
  Mermaid block via mermaid.live and export as PNG/SVG.
- Run every [DEMO] segment inside the Dec 2025 replay (Scenario →
  "Dec 2025 Delhi Severe+ Crisis") — zero live-API dependence, dramatic data,
  HISTORICAL REPLAY banner visible (that honesty is a feature; point at it).
- Keep demo segments under 30 seconds each; rehearse the exact click path.
