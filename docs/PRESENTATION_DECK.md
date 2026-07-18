# VayuDrishti — Presentation Deck Outline (10-12 slides)

> Ready-to-build slide content for Phase 3 (if selected as finalist). Paste each
> section into a slide; speaker notes are the indented text. Pair with live demo
> segments where marked **[LIVE DEMO]**.

---

### Slide 1 — Title
**VayuDrishti (वायुदृष्टि)**
*AI-powered Urban Air Quality Intelligence Platform*
Team [Your Team Name] · ET AI Hackathon 2.0

---

### Slide 2 — The Hook
**1.67 million Indians die every year from air pollution.**
The data to find them exists — 900+ CAAQMS stations under NCAP.
The intelligence to act on it doesn't: only **31%** of monitored cities have any
actionable response protocol (CAG, 2024).

> Speaker note: pause after each line. This is the emotional opening — every judge
> breathes this air too.

---

### Slide 3 — The Problem, Precisely
Three concrete capability gaps, not "not enough dashboards":
1. No source attribution — AQI 320, but *why*?
2. No forecasting — reactive to now, not to the next 72 hours.
3. No compound-risk correlation — a breach looks the same whether it's a blip or a
   genuine multi-signal event.

---

### Slide 4 — What VayuDrishti Is
One platform, five connected capabilities:
Live geospatial dashboard → 72h prediction → source attribution → multi-agent
enforcement/advisory intelligence → regulatory RAG chatbot.

**[LIVE DEMO]** Show the dashboard, switch cities (Delhi → Mumbai), toggle the
heatmap.

---

### Slide 5 — Architecture
Insert the Mermaid diagram from `ARCHITECTURE.md` (render it as an image, or embed
live if your slide tool supports Mermaid).

> Speaker note: call out the three layers (Data / Intelligence / Presentation) and
> that every AI-dependent path has a deterministic fallback — this is a production
> posture, not a demo hack.

---

### Slide 6 — Real Multi-Agent Intelligence (not a prompt wrapper)
Two LangChain tool-calling agents, verified against live Gemini:
- **Compound Risk Enforcement Agent** — pulls source attribution + forecast trend via
  tools before judging if a breach is a genuine compound risk.
- **Citizen Advisory Agent** — looks up nearby hospitals/schools itself, names them by
  location when conditions are severe.

**[LIVE DEMO]** Click "Run AI Compound-Risk Analysis" on an enforcement action; show
the agent's rationale citing attribution + forecast data.

---

### Slide 7 — Prediction, Evaluated Honestly
72-hour XGBoost forecast, trained on real lag/rolling time-series features with a
chronological train/test split.

**Result: RMSE 14.3 vs. 19.4 persistence baseline — a 26.2% improvement** — the exact
metric this problem statement's evaluation focus names.

**[LIVE DEMO]** Show the prediction chart with the confidence band; point out the
alert when forecast crosses 300.

---

### Slide 8 — Source Attribution, With Evidence
Pie chart breakdown (vehicular / industrial / construction / biomass) backed by real
TomTom traffic and NASA FIRMS fire-hotspot data, with circular-mean wind evidence.

**[LIVE DEMO]** Open the attribution panel for a station; show the evidence trail.

---

### Slide 9 — Citizen Impact
Multi-language (6 Indian languages) advisories, agent-generated per severity,
naming specific nearby vulnerable locations. Vulnerability overlay (schools,
hospitals, outdoor-worker zones) on the map.

**[LIVE DEMO]** Toggle the vulnerability overlay; switch advisory language tabs.

---

### Slide 10 — Scalability
- New city = one config entry, zero code changes.
- Pooled, station-agnostic ML model — no per-station retraining to onboard stations.
- Indexed for CPCB's full 900+ station network, not just the 8-city demo.
- Agent cost scales with usage (on-demand), not station count — compatible with
  free-tier LLM rate limits even at national scale.

---

### Slide 11 — Business Impact & Roadmap
- CPCB / SPCBs: evidence-backed, priority-ranked enforcement.
- Municipal bodies: the "multi-agency response protocol" 69% of cities lack.
- Roadmap: direct CAAQMS data partnership, mobile/IVR advisory delivery, permit-to-work
  integration for the enforcement agent.

---

### Slide 12 — Close
**VayuDrishti doesn't just measure pollution. It tells you why, predicts what's next,
and acts on it.**
GitHub: [repo URL] · Team: [Your Team Name]

---

## Notes on building this in slides

- Use the color palette and AQI category colors already defined in
  `frontend/src/utils/aqiColors.js` / `constants.js` for visual consistency with the
  live product.
- For the architecture diagram slide, render `ARCHITECTURE.md`'s Mermaid block via
  the Mermaid Live Editor (mermaid.live) and export as PNG/SVG if your slide tool
  doesn't support Mermaid natively.
- Keep live demo segments under 30 seconds each — rehearse the exact click path
  beforehand so nothing depends on live API latency during the actual pitch.
