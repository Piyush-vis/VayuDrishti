# VayuDrishti — Demo Video Script (3-4 minutes)

> This script describes what the app actually does right now, verified against a
> running instance (backend hit route-by-route, `docker-compose up` brought up end to
> end with real MongoDB). Rehearse the exact click path once before recording so
> nothing depends on live API latency during the take.

**Before recording:** run `docker-compose up --build`, wait for
`vayudrishti-backend`'s log to print `Application startup complete`, then open
http://localhost:5173. Pick Delhi as the starting city (worst AQI, most visually
striking).

---

### Scene 1 — The Hook (0:00–0:15)
*Black screen, white text fading in, no voiceover yet.*
> "1.67 million Indians die every year from air pollution."
> [pause]
> "900+ monitoring stations already collect the data."
> [pause]
> "Only 31% of monitored cities have any actionable response protocol."
> [pause]
> "VayuDrishti closes that gap."
*[Logo + tagline]*

### Scene 2 — Live Map (0:15–0:50)
*Dashboard tab, Delhi selected.*
> "This is VayuDrishti's command center — live air quality data across 25 monitoring
> stations in 8 Indian cities."

*Click a station marker (e.g. Anand Vihar) — popup/side panel shows AQI, PM2.5, PM10,
pollutant sub-indices.*
> "Each station shows real-time readings, computed with the actual Indian NAQI
> formula against CPCB breakpoints."

*Toggle the heatmap layer on.*
> "The heatmap interpolates between stations to show pollution density across the
> whole city."

*Drag the time slider back to -24, hit play.*
> "And this timelapse isn't decorative — it's pulling the real recorded reading
> closest to each past hour from the database, station by station."

### Scene 3 — Prediction (0:50–1:25)
*Switch to Predictions tab (station still selected).*
> "VayuDrishti doesn't just show the present — it predicts the next 72 hours."

*Point at the chart, the shaded confidence band.*
> "This is a recursive XGBoost forecaster, trained on real lag and rolling features
> from the station's own history — not synthetic noise. The shaded band is an 80%
> confidence interval that widens the further out we forecast, because uncertainty
> compounds over time."

*Point at the "Base Model RMSE" stat in the summary panel.*
> "On held-out data, this model scores 14.3 RMSE against a naive persistence baseline
> of 19.4 — a 26% improvement, evaluated the way the problem statement asks: against
> the 'AQI tomorrow equals AQI today' baseline, not against itself."

*If an alert is showing:*
> "When a forecast crosses the 'Very Poor' threshold, it shows up here automatically."

### Scene 4 — Source Attribution (1:25–1:50)
*Navigate to the attribution panel (Dashboard's right side panel, or wherever wired).*
> "Knowing the AQI is bad isn't enough — you need to know why."

*Show the pie chart and evidence trail (traffic score, industrial count, fire
hotspots, wind direction).*
> "This correlates real TomTom traffic congestion, industrial zone proximity, and
> NASA satellite fire-hotspot data — not guesses. Every attribution has an evidence
> trail."

### Scene 5 — Compound Risk Enforcement Agent (1:50–2:30)
*Navigate to the Enforcement tab.*
> "VayuDrishti's enforcement desk generates priority-ranked action recommendations
> from rule-based threshold breaches — fast and deterministic."

*Click "Run AI Compound-Risk Analysis" on one action. Wait for the result to appear
(a few seconds — real Gemini call).*
> "But it can go further. This button runs a real tool-calling AI agent — not a
> single prompt. It independently looks up the zone's source attribution and the
> station's forecast trend, cross-references them, and tells us whether this is a
> genuine compound risk or an isolated blip — citing regulatory context when it can."

*Read the AI's rationale text out loud briefly.*

### Scene 6 — Citizen Advisory (2:30–3:00)
*Navigate to the Advisory tab, or open the floating chat/advisory panel.*
> "For citizens, VayuDrishti's Advisory Agent writes localized health guidance in six
> Indian languages — and it looks up nearby vulnerable locations itself when
> conditions are severe, so the guidance can name a specific nearby hospital or
> school instead of being generic."

*Switch language tabs (English → Hindi → Tamil).*

### Scene 7 — Regulatory Chat + Multi-City + Close (3:00–3:45)
*Open the floating chat widget, ask: "What is the NAQI threshold for PM2.5?"*
> "And administrators can query CPCB regulations directly — retrieval-augmented, with
> cited sources, and it says so honestly when an answer isn't in the corpus rather
> than guessing."

*Switch city selector Delhi → Mumbai — whole dashboard updates.*
> "Same platform, any city — adding a new one is a config entry, not new code."

*Final card, dark background, white text:*
> "VayuDrishti doesn't just measure pollution. It tells you why it's happening, what
> comes next, and what to do about it."
*[Logo + GitHub URL + team name]*

---

## Notes for the person recording

- Record at 1080p, OBS Studio (free) works well for screen capture.
- If a live Gemini call is slow during Scene 5, cut and let it resolve off-camera,
  then resume — don't pad the video with a spinner.
- Keep pollutant numbers on-screen matching whatever the live seeded/ingested data
  actually shows at recording time — don't reuse the exact numbers from this script,
  they're illustrative placeholders for pacing, not scripted values to force.
