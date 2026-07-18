# plan.md — VayuDrishti Win Plan (ET AI Hackathon 2026, Phase 2)

> **This is the master build plan.** Every agent and human working on this repo works
> strictly from this file, in tier order. Companion files: `CLAUDE.md` (how to work
> here), `RULES.md` (hard rules), `MEMORY.md` (settled decisions), `docs/DECISIONS.md`
> (rationale). Produced 2026-07-19 from a 10-agent research workflow (6 web
> researchers, 3 scoring judges, 1 completeness critic; ~508k tokens; all claims below
> carry sources).
>
> **Deadline: 22 July 2026, 11:59 PM IST. ~3 build days remain.**

---

## 1. Mission and judging math

Submit on Unstop: working prototype (GitHub + ideally a public URL), detailed PDF
document, 3-4 min demo video, deck/diagrams.

| Criterion | Weight | Our scoring strategy (one line) |
|---|---|---|
| Innovation | 25% | Forecast-triggered GRAP automation + HYSPLIT-lite trajectories + CPF confidence — mechanisms no map-and-chatbot team will ship |
| Business Impact | 25% | Named buyer (CAQM/NCAP cities), documented policy failure we fix (13/17 reactive GRAP invocations), money that already exists (₹3,600+ cr unspent NCAP funds), impact in people/life-years |
| Technical Excellence | 20% | Real metrics (RMSE vs persistence at 24/48/72h), SHAP + CPF explainability, provenance badges, live Swagger API, 19+ green tests |
| Scalability | 15% | Official data.gov.in CPCB feed (500+ stations) demoed live, station-agnostic pooled model, city = config entry |
| User Experience | 15% | War-room incident flow, episode replay drama, voice advisories in Indian languages, polished dark command-center UI |

**Judge attention reality (researched):** shortlist reviewers spend ~4 minutes; they
open three artifacts first — live URL, video, README. A working demo must appear
within ~90 seconds of the video. "A strong project with a confusing demo loses to a
simpler project the judges understand" (JetBrains judging-table report).

**Proven ET-winning formula (researched):** the reigning ET hackathon champion
(AgriBloom Agentic, repo `Sak3th2004/AgriBloom-Agentic-ET2026`) won with almost our
exact architecture class: multi-agent + RAG + vernacular languages + a
**deterministic non-LLM rules engine with audit trail** + numbers-dense README +
14/14 tests. This validates our stack and tells us exactly how to present it.

---

## 2. Problem-statement decision — SETTLED: PS5, do not revisit

Full rationale in `docs/DECISIONS.md` ADR-7. Compressed comparison:

| PS | Real data obtainable in 3 days? | Reuses our build? | Verdict |
|---|---|---|---|
| 1 Industrial safety | No (plant sensors/SCADA = 100% fabricated) | ~15% | No |
| 2 Energy supply chain | No (AIS feeds cost money; demo would be fiction) | ~10% | No |
| 3 EV asset/supply | No (BMS/battery telemetry inaccessible) | ~15% | No |
| 4 Data centre EPC | No (proprietary document corpora) | ~20% | No |
| **5 Urban air quality** | **Yes — CPCB/AQICN/Open-Meteo/FIRMS/satellite, all free, verified live** | **~100%** | **YES** |
| 6 Fraud/counterfeit | Partially (sensitive datasets; brutal false-positive bar) | ~10% | No |
| 7 Cyber resilience | Benchmarks exist but demo is log dashboards | ~10% | No |
| 8 Industrial knowledge | No (needs real industrial documents; eval demands them) | ~25% | No |

PS5 is also the only PS whose evaluation focus we can answer with *measured real
numbers* (RMSE vs persistence). Everything below assumes PS5.

---

## 3. Win thesis — one coherent story, not a feature pile

The Business Impact judge's verdict, adopted as doctrine: **"Coherence beats
coverage."** Every Tier-1 feature is a link in ONE chain, which is also the demo
video's spine and the war-room flow:

> **Dec 2025 crisis replay** (real station values: Anand Vihar AQI 644) →
> **our forecast sees it coming** (24-72h, RMSE-vs-persistence proven) →
> **GRAP engine fires Stage III/IV 24-48h before CAQM actually did** (they were
> reactive 13 of 17 times last winter — cited) →
> **evidence-backed action list** (real statutory GRAP checklists + attribution with
> CPF confidence + fire back-trajectories) **tagged to unspent NCAP funds** →
> **impact quantified in humans**: people protected (WorldPop), life-years saved
> (AQLI), deaths averted (WHO AirQ+) →
> **citizens hear it** in their own language (voice advisory) →
> on-screen counter: **signal → intervention in minutes, vs the >24h documented
> government lag.**

Features outside this chain are decoration and must never displace a link in it.

---

## 4. CRITICAL FIXES FIRST — landmines a judge would find (from the code-audit critic)

These are not features; they are credibility bombs already in the repo. **All are
Tier 0 and come before any new feature.**

### 4.1 Attribution engine uses random-seeded fake covariates ⚠ WORST FINDING
`backend/services/attribution.py` (~lines 95-106): `traffic_score`,
`industrial_count`, `construction_count`, `fire_count` are generated from
`random.seed(hash(zone+city)+day)` + `random.uniform/randint` when live APIs don't
override them — and there is **no `confidence` field at all** despite the PS requiring
"attribution with confidence scores". A judge who opens the repo finds randomized
inputs feeding "evidence" cards. Fix (≤1 day, part of Tier 1 item T1-4):
- Implement CPF (Conditional Probability Function) wind-sector probabilities as the
  real statistical confidence backbone (published openair/GOV.UK method, ~100 lines
  of numpy over data we already have).
- Keep FIRMS + TomTom as the only live covariates; anything simulated gets explicitly
  labeled `"source": "simulated"` in code AND a visible badge in the UI.
- Add a real `confidence` field to the attribution payload derived from CPF sector
  probability + data-source quality.

### 4.2 README/architecture overclaims vs code
Current README advertises "ML clustering" attribution and an "Anomaly Detection"
agent — neither exists. Every claim must be reconciled with code during the README
rewrite (Tier 1 T1-9). Judges explicitly say they open repos to verify substance.

### 4.3 Language-count honesty
We say "6 regional Indian languages" but count English among them. Either reword to
"6 languages including English" everywhere, or add Marathi (`mr`) via the advisory
agent + cached outputs. Cheap; do during T1-9.

### 4.4 Replay plumbing is map-only
TimeSlider currently drives ONLY the map. If forecaster/attribution/GRAP/advisories
don't accept a replay timestamp, the "crisis unfolds" story silently degrades to a
colored scrubber. The replay build (T1-1) must wire a `replay context` through every
service and include a pytest that hits each service with a historical timestamp.

### 4.5 Number consistency ledger
One inconsistent number across README/deck/PDF/video costs trust in all of them.
Canonical numbers live in §12; update that table whenever a metric changes.

---

## 5. Build plan

Effort estimates assume AI-agent velocity. Every item lists its demo moment — if a
feature has no demo moment, it doesn't get built.

### TIER 0 — Demo-credibility infrastructure (non-negotiable, do first)

**T0-1. Fix the attribution landmine** — see §4.1. *(bundled with T1-4)*

**T0-2. LLM response pre-cache layer** — ~0.5 day
Keyed cache (Mongo + JSON file fallback) around both agents + RAG chat; serve
cached-first with live-call-if-quota; subtle "cached hh:mm / live" badge. Then one
batch pre-generation run over all demo scenarios (all replay states × languages ×
personas) **while quota is fresh — user must supply a fresh/paid Gemini key first**.
Kills the #1 demo failure mode (observed 429s at ~20 req/day; also a model-name 404
already happened once — pin the model string).
*Demo moment:* nothing stalls, ever. Also a Technical Excellence talking point
("quota-resilient architecture").

**T0-3. Provenance badge system** — ~2-3h
One React component + a `source` field on API responses: **LIVE / CACHED hh:mm /
HISTORICAL REPLAY / SIMULATED** on every data panel. Three separate judge lenses
independently flagged honesty-labeling as trust-critical. Converts our fallback
architecture from a liability into a feature ("full data provenance").

**T0-4. Commit everything + repo strategy** — user action, tonight (§11).

### TIER 1 — The winning chain (build in this order)

**T1-1. Historical Episode Replay: "Dec 2025 Delhi Severe+ crisis"** — ~1 day
THE demo multiplier (proposed independently by all 6 researchers; it is monsoon —
Delhi read AQI ~62-111 on 18 Jul 2026; July 2025 was Delhi's cleanest July since
2018). Build ONE replay, honestly labeled:
- Dataset: simulator calibrated to the real 13-14 Dec 2025 episode, seeded with real
  headline station values (Anand Vihar 644, Wazirpur 635, Mundka 560, Mandir Marg
  519 — sources in §13) + archived FIRMS fire points. Committed under
  `backend/data/episodes/` (note: old `sample_data/` dir was deleted; create fresh).
- A scenario switcher ("Live now" / "⏮ Replay: Dec 2025 crisis") + persistent
  **"HISTORICAL REPLAY"** banner while active.
- **Replay context wired through every service** (forecast, attribution, GRAP,
  enforcement, advisory) + a pytest hitting each with historical timestamps.
- Skip OpenAQ S3/CCR bulk wrangling (feasibility judge: not worth it); use real
  numbers as calibration targets. CAMS reanalysis understates Delhi peaks (~132 vs
  400+) so do NOT source the episode from CAMS.
*Demo moment:* the entire crisis unfolds end-to-end in 60 seconds of video.

**T1-2. Forecast-Triggered GRAP Automation Engine (+ statutory action checklists)** — ~1 day
The headline feature; highest combined judge score (Innovation 9-10, Business 10).
- Rules layer over the existing forecaster: Stage I "Poor" AQI 201-300, II "Very
  Poor" 301-400, III "Severe" 401-450, IV "Severe+" >450 (official CAQM table).
  Trigger = forecast trajectory crossing + sustaining a threshold.
- Auto-draft a CAQM-style invocation order: stage, effective time, **the real
  mandated actions** (Stage III: BS-III petrol/BS-IV diesel LMV ban, C&D halt,
  classes ≤V hybrid; Stage IV: non-essential truck entry ban, total C&D ban, classes
  VI-IX+XI online) with responsible agencies, cross-referenced to our live signals
  (TomTom → vehicle bans, station PM spikes → construction, FIRMS → burning).
- **Lead-time-gained stat**: our trigger time vs when AQI actually crossed.
- Template-generated (no LLM dependency); optional cached Gemini polish.
- Works for Delhi + at least Mumbai (multi-city proof; also see T2-1).
*Pitch hook (all cited):* CAQM's own policy says stages "shall be invoked in advance"
based on forecasts — yet 13 of 17 invocations in winter 2025-26 were reactive
(ThePrint/CEEW). On 10 Nov 2025 Delhi hit AQI 362; GRAP-III came only 11 Nov at 425+.
**We automate a policy the government already wrote but fails to execute.**
*Demo moment:* during replay, banner flips "⚠ Forecast crosses 401 at T+36h — Stage
III invocation order drafted" days before the government actually acted.

**T1-3. Signal-to-Intervention War Room ("Incident view")** — ~1-1.5 days
The demo spine. One orchestrated React view chaining what already exists: spike
detected → attribution card (with CPF confidence %) → GRAP/enforcement action with
evidence bundle → advisory dispatched (voice) — with a visible elapsed-time counter:
**"Signal → Intervention: 4m 12s"** vs the documented >24h government lag (use the
Nov 10-11 citation, never an invented "48h" figure). Fold in the KPI stat card.
*Demo moment:* the PS's own final evaluation metric, on screen, as a number.

**T1-4. Real attribution science: CPF confidence + calibration + validation** — ~1 day total
Three sub-parts that together answer the PS's FIRST evaluation focus (attribution
accuracy) — currently unanswerable:
- (a) **CPF/CBPF wind-sector probabilities** (fixes §4.1) + a polar "pollution rose"
  per station — visually unique, peer-reviewed lineage. ~3-4h.
- (b) **Calibrate priors to published Delhi PMF splits** (secondary 21.3%, dust
  20.5%, vehicles 19.7%, biomass 14.3%...) with a comparison chart labeled
  **calibration** (never "independent validation" — judges flagged the circularity
  trap). Cite the DPCC/IITK real-time source-apportionment contract: *a state
  government already pays crores for exactly this capability.* ~2-3h.
- (c) **Attribution validation mini-study**: correlate our biomass share against
  FIRMS fire counts across the replay episode timeline (r-value) + show attribution
  composition flipping monsoon-live vs Dec-replay. This manufactures an honest
  "directionally validated" number for the most predictable jury attack. ~3-4h.
*Demo moment:* "68% vehicular — and here is the wind-sector probability and the
evidence behind that number."

**T1-5. HYSPLIT-lite 2D back-trajectories fused with FIRMS fires** — ~1 day
Innovation judge's only 10/10. Euler back-integration (20-line integrator) through
hourly ERA5 wind fields (Open-Meteo historical API — keyless, verified) from each
station; animated Leaflet polylines; intersect trajectory corridors with FIRMS
detections → **"this air mass passed over 47 active Punjab crop fires 18h ago."**
State the documented limitations honestly (2D, wind-field error dominates).
*Demo moment:* animated causal provenance on the map — agency-grade evidence no
dashboard team will have. Also the inter-state stubble-burning evidence CAQM needs.

**T1-6. Health Impact Engine (3 lenses, pure arithmetic, zero risk)** — ~1 day
- **AQLI life-years**: `0.098 × max(0, PM2.5 − 5)` life-years lost per resident
  (EPIC/UChicago; Delhi average ≈ 8.2 years lost). Citizen framing.
- **WHO AirQ+ deaths averted**: RR 1.08 per 10 µg/m³ → attributable fraction →
  "acting on this source could avert ~X deaths/year". Policymaker framing.
- **WorldPop population-weighted exposure**: 1km India density GeoTIFF (17MB direct
  download, no auth, verified) → "this action protects ~340,000 people"; exposure-
  ranked enforcement (dense-slum source outranks empty-industrial source).
All assumptions labeled on-screen with sources — one invented number found in Q&A
zeroes the Business Impact score.
*Demo moment:* the dashboard re-denominated from concentrations to human lives.

**T1-7. Voice advisories: Web Speech TTS + phone-frame IVR simulator** — ~0.5 day
The mobile/IVR channel is a named PS capability at 0% built. ONE voice build (voice
was proposed 6 times — build once):
- "🔊 सुनें / Listen" button on AdvisoryPanel via browser `speechSynthesis`
  (`hi-IN`, `ta-IN`, `bn-IN`, `te-IN`, `kn-IN`) — zero backend, zero quota.
- Pre-generated MP3 fallback via edge-tts (bundled; Chrome fetches Indian voices
  over network — test `getVoices()` on the demo machine).
- A phone-frame "IVR preview" card ("Press 2 for हिंदी") playing the cached audio +
  a WhatsApp-style advisory card mock. **No live telephony** (Twilio sandbox =
  "demo suicide": join codes, ngrok, 5-number trial limits — all three judges).
*Pitch hook:* CPCB's own SAMEER app is English-only; ~90% of new Indian internet
users prefer regional languages; mKisan proves government IVR at 5-crore scale.
*Demo moment:* a Hindi advisory speaks out loud in the video.

**T1-8. Official CPCB feed adapter (data.gov.in) — scalability made live** — ~0.5 day
Endpoint verified working 19 Jul 2026 with the public sample key (315 Delhi records,
hourly, 8 pollutants). Additive adapter behind a flag, de-duped against curated
stations. *Demo moment:* "we ingest the official Government of India feed — the
platform scales to 500+ CAAQMS stations", shown live, not claimed.
(User: register a free personal data.gov.in key; sample key works meanwhile.)

**T1-9. The writing cluster (timeboxed: ONE day total, zero code risk)**
- **README champion-formula rewrite**: numbers-dense feature table up top, agent
  pipeline diagram, "deterministic evidence engine with audit trail" framing,
  Quick Start, screenshots — cloning the exact skeleton that won ET v1. Includes the
  §4.2 claims-vs-code reconciliation and §4.3 language fix.
- **Judging-criteria mapping table** (README + deck): each of the 5 criteria AND
  each PS capability AND each PS evaluation focus → feature + measured number.
  Does the judge's rubric work for them in their 4-minute window.
- **Business impact in rupees + procurement path**: problem cost ($95B/yr, 3% GDP —
  Dalberg/CII), buyer (131 NCAP cities, performance-linked funds, ₹11,211 cr
  released / 68% used / Delhi ~20%), per-city SaaS estimate, Immediate/3-month/
  6-month roadmap. Frame as "NCAP-fundable pilot aligned with CAQM policy + Jan 2026
  SC directive" — never imply endorsement.
- **Positioning vs incumbents**: SAFAR covers ~7 metros; IITM DSS covers Delhi only,
  runs a 2021 inventory, and was suspended by CAQM over reliability; only 8 of 131
  NCAP cities have any early-warning system. Coverage-gap panel + deck slide.
  Microsoft Aurora (Nature 2025) validates AI-for-air-quality at 44km; we operate at
  city scale where interventions happen.
- **Data licensing section**: per-source license + attribution strings + official
  migration path (data.gov.in) — answers "can you legally ship this to 131 cities?"
- **Backtest evidence at 24/48/72h**: the "72h gap" is a phantom (the forecaster
  already serves 72h) — what's missing is the RMSE-vs-persistence backtest at all
  three horizons. Write the backtest script, put all three numbers in README + a
  small Model Performance panel. **Do NOT retrain the model** (freeze rule: a
  regression days before deadline could kill the headline 26% claim).

**T1-10. SHAP explainability on the forecaster** — ~3h
TreeExplainer on the saved model, cached with each forecast; waterfall card:
"forecast +38 AQI: low wind +14, humidity +9, yesterday's PM2.5 +11". Completes the
explainable-pipeline story (SHAP explains the forecast; CPF/trajectories explain the
source). Cite the XGBoost+SHAP state-of-practice literature.

**T1-11. Deploy + harden + video + submit** — reserve the FINAL full half-day+ (§8, §9)

### TIER 2 — Cheap adds, only after ALL Tier 1 lands (each ≤ 0.5 day)

| # | Feature | Hours | Why |
|---|---|---|---|
| T2-1 | Multi-city leaderboard with rank-change deltas (IQAir pattern), in Compare view | 2-4h | Fixes the "Delhi tool with 7 decorative cities" gap; multi-city is a PS requirement |
| T2-2 | Ventilation Coefficient explainer card (Open-Meteo `boundary_layer_height`, keyless, verified: 55m→1,775m Delhi diurnal swing) | 3h | "Why will AQI spike tonight" physical mechanism; display-only, don't touch the model |
| T2-3 | Sensitive-receptor layer: schools/hospitals via Overpass (verified: 103 receptors in one Delhi bbox) | 4h | "23 schools inside tomorrow's red zone" — advisory relevance made concrete |
| T2-4 | NCAP/PRANA fund-utilization overlay + funding-category tags on actions | 4h | "The money already exists — we tell you where to spend it" |
| T2-5 | Supreme Court compliance report export (print-styled HTML, not PDF libs) | 4h | Fulfils the 6 Jan 2026 SC directive to CAQM verbatim |
| T2-6 | Environmental-compensation calculator (₹5k/10k/30k stubble EC tiers, Air Act ₹5k/day) | 4h | Monetized, legally-literate enforcement |
| T2-7 | Kiosk/TV mode (`/kiosk` auto-rotating route) | 3-4h | Deployment narrative: same system drives public screens |
| T2-8 | IDW interpolated AQI surface + dominant-pollutant chips | 0.5-1d | Continuous surface instead of dots; pick THIS as the one grid implementation |
| T2-9 | Judge-mode guided tour ("▶ 90-second tour" auto-walking the war room) | 3-4h | Unattended shortlist reviewer sees the intended narrative |
| T2-10 | Ward choropleth, Delhi (DataMeet GeoJSON) | 4h | Officials govern by wards; do Delhi only, say so |
| T2-11 | Bring-your-own-sensor POST endpoint + curl demo | 4h | Executable scalability argument (PurpleAir/Clarity pattern) |
| T2-12 | What-if source sliders (DSS-lite linear mixing, cite IITM 20%→12% scaling) | 1d | Interactive decision-support moment — first cut if behind schedule |

### CUT LIST — decided, do not revisit (reasons logged)

- **MapLibre/basemap migration** — rewriting a working map days before deadline.
- **Live telephony (Twilio WhatsApp/Voice)** — multiple live failure points; simulate + pre-record.
- **Google Earth Engine satellite path** — approval/auth time sink; if satellite garnish is wanted, the keyless NASA GIBS OMI tile layer is 1-2h (note: GIBS has no S5P layer; OMI ~25km = "corroboration" only).
- **1km LUR grid / GNNs / Aurora** — overscoped; we cite the MSDGNN paper (~7-9% gains on 22 stations) as the defense for XGBoost in Q&A.
- **Clean-air routing** — chained dependency on heatmap + public OSRM mid-pitch.
- **Model retraining of any kind** — frozen until after submission.
- **Cigarette-equivalence card** — innovation judge: worn trope; business judge: gimmick in a governance pitch. (If ever added: citizen view only.)
- **OpenAQ S3 / CPCB CCR bulk history wrangling** — replay uses calibrated simulator + real headline values instead.

---

## 6. Day-by-day schedule (IST)

**Tonight, Sat 19 Jul (remaining hours)**
1. USER (§11): read the actual Unstop submission form; rotate + top up Gemini key; commit current work.
2. T0-3 provenance badges; start T1-1 replay dataset + plumbing.
3. Start T1-4a CPF fix (the landmine).

**Sun 20 Jul — the intelligence day**
- Finish T1-1 replay end-to-end (all services + pytest).
- T1-2 GRAP engine + checklists + lead-time stat (Delhi + Mumbai).
- T0-2 LLM cache + batch pre-generation (needs fresh key).
- T1-4b/c calibration chart + validation mini-study.
- T1-6 health impact engine.
- *Must land today: replay + GRAP. Everything else can slip one day.*

**Mon 21 Jul — the experience day**
- T1-3 war-room incident view + counter.
- T1-5 back-trajectories + FIRMS fusion.
- T1-7 voice + phone frame. T1-8 data.gov.in adapter. T1-10 SHAP.
- T1-9 writing cluster (timebox: one day, in parallel via agents).
- Backtest 24/48/72h numbers → README + panel.
- Evening: full route sweep + pytest + `npm run build` + docker compose verification.
- T2 items only if all of the above is green.

**Tue 22 Jul — the shipping day (NO new features after 12:00)**
- Morning: deploy public URL (§8), seed-on-boot, pinger, smoke test; publish clean
  public repo (§8.3); freeze the number ledger (§12).
- Midday: record video against the replay (§9); export PDF doc from
  `docs/DETAILED_DOCUMENT.md`; finalize deck.
- ~16:00: **submit a complete draft on Unstop** (most portals allow re-submission).
- Evening: fix-ups, final re-submission well before 23:59. Keep pinger running
  after the deadline — shortlist review happens later.

---

## 7. Q&A defense sheet (Phase 3 prep — write now, rehearse later)

| Predictable attack | Our answer |
|---|---|
| "How do you know attribution is right?" | CPF wind-sector probabilities (published method) + priors calibrated to published Delhi PMF splits + directional validation against FIRMS over the Dec episode (r-value) + honest stated limits. And DPCC already pays IITK crores for this capability — we generalize it. |
| "Why XGBoost, not deep learning?" | 25-station graph is too sparse for GNN gains (cite MSDGNN ~7-9% on 22 stations); we beat persistence by 26% with chronological splits, and Aurora (Nature 2025) works at 44km — useless for ward-level intervention. Right tool, defended. |
| "Is this demo live?" | Provenance badges on every panel: LIVE/CACHED/REPLAY/SIMULATED. The replay is labeled on-screen. Here's the live view — it's monsoon, air is clean, which is exactly why the replay exists. |
| "Who pays for this?" | 131 NCAP non-attainment cities with performance-linked funding, ₹3,600+ cr unspent; CAQM needs forecast-triggered GRAP per its own policy; SC ordered public findings in Jan 2026. Pilot-sized ask, existing budget line. |
| "What about the LLM rate limits/cost?" | Every AI path has a deterministic fallback; LLM outputs are cached; the demo runs with zero API keys. Production would use paid tier — unit economics on the impact slide. |
| "Simulated data?" | Labeled everywhere, in code and UI. Live paths are real (AQICN, official data.gov.in feed, Open-Meteo, FIRMS, TomTom). The simulator is a physically-grounded fallback and we say so. |

---

## 8. Deployment plan (public URL)

**8.1 The RAM/image problem:** the full Docker image is ~10GB (torch via
sentence-transformers) — free tiers (Render 512MB) will die. Fix: a deploy profile
that drops `sentence-transformers` (rag.py never imports it; ChromaDB's default
embedding uses its own ~80MB ONNX model) → verify memory locally; if ChromaDB still
doesn't fit, env-flag it off — the TF-IDF fallback IS the escape hatch and it's honest.
**8.2 Hardening:** synchronous seed-on-boot loading the bundled replay dataset before
serving (a judge's first click must never see an empty chart); UptimeRobot pinger
(free-tier sleep ~15min); smoke-test script hitting replay/forecast/attribution/GRAP/
advisory endpoints — run before recording and each judging-window morning.
**8.3 Public repo strategy:** publish a FRESH repo named `vayudrishti` with a clean
initial commit of product files only. This simultaneously solves: secrets in git
history (no history), internal strategy files leaking (plan.md, CLAUDE.md, MEMORY.md,
RULES.md, et_hackathon_strategy.md stay in this private working repo), and the
"ET Hackathon vibe coded" folder name. Keep this working repo private forever.
**8.4** Expose FastAPI `/docs` (Swagger) on the deployed URL; README links it with 2-3
curl one-liners + QR code on the deck's last slide.

## 9. Demo video plan (rewrite of docs/DEMO_SCRIPT.md when features land)

≤3 minutes (VERIFY the actual Unstop limit), screencast + narration, recorded against
the replay (zero live dependencies), uploaded to YouTube **hours early**, visibility
public/unlisted (never private), marked "Not for Kids".
Structure: 15s hook (1.67M deaths; the government's own GRAP is reactive 13/17 times)
→ 90s war-room flow on the Dec 2025 replay (forecast → GRAP order drafted 36h early →
evidence: trajectories over Punjab fires, CPF rose → voice advisory in Hindi → counter)
→ 30s metrics screen (RMSE vs persistence 24/48/72h, lead time gained, people
protected) → 15s scalability (data.gov.in live, 131-city roadmap) → close.

## 10. Risk register

| Risk | Mitigation |
|---|---|
| Gemini 429/renames during demo | T0-2 cache; nothing live in video; pinned model string; fresh key |
| Monsoon = boring live data | T1-1 replay is the answer; live view shown as honesty proof |
| Free-tier cold start / empty state | Seed-on-boot, pinger, smoke test, "allow 30s" README note |
| External API stalls during recording | Record against replay; short timeouts + simulator fallback verified |
| TimeSlider fragility (crash history) | Replay pytest across full scrub range before recording |
| Replay read as faked data | Persistent on-screen label + provenance badges |
| Unstop form surprises (template/size caps) | USER reads form TODAY; draft submission by 16:00 on the 22nd |
| Uncommitted work loss | Commit tonight and daily |
| Keys leaked in transcripts/history | Rotate; fresh public repo with clean history; never print .env |
| Number drift across artifacts | §12 ledger is canonical; update it first |

## 11. USER ACTION ITEMS (only you can do these)

1. **TODAY: open the actual Unstop Phase 2 submission page** and write its exact
   field list / file limits / video length into this file (§9 assumption check).
2. **Rotate the Gemini/AQICN/TomTom keys** (leaked to tool transcripts twice) and
   provide a fresh Gemini key (ideally paid or a second free project) BEFORE the
   pre-generation batch run.
3. **Commit tonight** (say the word and I'll stage it cleanly) and daily after.
4. Register a free data.gov.in API key (2 min) for T1-8.
5. Decide team name; keep GitHub account / YouTube channel / Unstop identity
   consistent (organizers verify repo ownership; your Unstop email is
   aryancodes9981@gmail.com, git author is "piyush").
6. On the 22nd: create the public `vayudrishti` repo under your account (I'll prepare
   the clean tree), upload the video to your YouTube, and click submit on Unstop.

## 12. Canonical number ledger (single source of truth for ALL artifacts)

| Metric | Value | Where measured |
|---|---|---|
| Forecast RMSE vs persistence (24/48/72h) | **13.83/13.76/13.78 vs 19.00/19.22/18.78 → +27.2%/+28.4%/+26.6%** | `ml/saved_models/backtest_results.json` (direct multi-horizon, `python -m backend.ml.backtest`) |
| Forecast RMSE (24h) training holdout | 13.98 vs 19.44 (+28.1%) | `model_metadata.joblib` |
| Cities / stations (curated) | 8 / 25 | `stations.json` |
| Official-feed records reachable | 3,500 live; 500+ CAAQMS stations published | verified live 19 Jul (`/data/gov-feed/coverage`) |
| Languages | 6 incl. English | advisory templates/agent |
| Tool-calling agents | 2 (enforcement compound-risk, citizen advisory) | `services/agents.py` |
| Pytest count | **57** | `backend/tests/` |
| GRAP thresholds | 201/301/401/451+ (Stages I-IV) | CAQM schedule PDF |
| Reactive GRAP invocations 2025-26 | 13 of 17 | ThePrint/CEEW |
| Dec 2025 episode peaks | Anand Vihar 644, Wazirpur 635, Mundka 560, Mandir Marg 519 | press/CAQM order 13 Dec 2025 |
| Health coefficients | AQLI 0.098 yr per µg/m³ >5 (annual-eq capped 130); WHO RR 1.08/10µg/m³ (CRF capped 150) | EPIC/WHO |
| Delhi exposed population (curated stations) | ~4.78M | `services/health_impact.py` catchments |
| Economic cost of problem | $95B/yr (3% GDP) Dalberg-CII; 1.67M deaths/yr Lancet | pitch docs |
| NCAP funds | ₹11,211 cr released, 68% used, Delhi ~20% | CREA 2025/26 |

**Build status (2026-07-19):** Tier 0 + all Tier 1 features T1-1..T1-10 SHIPPED
and verified (replay, GRAP, CPF attribution, trajectories, health, war-room,
voice, data.gov.in, SHAP+backtest, LLM cache, provenance badges, README rewrite).
Forecaster recursion bug found+fixed (direct multi-horizon). Remaining = Tier 2
(optional) + T1-11 (deploy/video/submit, needs USER).

## 13. Source bank (for pitch/docs writing — abbreviated; full URLs in research digest)

GRAP schedule & Stage-IV order: caqm.nic.in (PDFs) · Reactive invocations: theprint.in, ceew.in ·
Dec 2025 episode: aqi.in blog, PIB · SC order 6 Jan 2026: scobserver.in · NCAP funds: energyandcleanair.org (CREA) ·
PRANA: prana.cpcb.gov.in · IITM DSS & suspension: ews.tropmet.res.in, vajiramandravi.com · SAFAR: safar.tropmet.res.in ·
DPCC/IITK contract: ddc.delhi.gov.in · PMF splits: pubmed 27209541 · CPF/openair: openair-project.github.io ·
AQLI: aqli.epic.uchicago.edu · WHO AirQ+: who.int/tools/airq · WorldPop tif: data.worldpop.org (direct link verified) ·
data.gov.in CPCB resource 3b01bcb8… (verified) · Open-Meteo BLH & AQ APIs (verified keyless) ·
ET v1 champion repo: github.com/Sak3th2004/AgriBloom-Agentic-ET2026 · Judging norms: devpost/MLH/DoraHacks/JetBrains blogs ·
Aurora: nature.com s41586-025-09005-y · Google AQ API pricing & BreezoMeter $225M: developers.google.com, calcalistech.com ·
Cost of pollution: dalberg.com, cleanairfund.org · IQAir 2025 report: iqair.com.

*Full research digest with every URL: session scratchpad `research_digest.txt` (244KB
raw output preserved in the workflow transcript).*
