# VayuDrishti — Demo Video Script (≤3 minutes, recorded against the Dec 2025 replay)

> The entire video is recorded inside the **Dec 2025 Delhi Severe+ replay** — zero
> live-API dependencies, no Gemini quota burned, dramatic (real) crisis data instead
> of July's clean monsoon air. The HISTORICAL REPLAY banner stays visible throughout:
> that honesty label is a feature — leave it in frame.

**Before recording:** run `docker-compose up --build`, wait for
`vayudrishti-backend` to log `Application startup complete`, open
http://localhost:5173. First boot seeds both live history and the Dec 2025 episode.
Do one full rehearsal of the click path below; the War Room pipeline takes a few
seconds to run, so know your beats.

**The click path (memorize this):**
Sidebar **Scenario → "Dec 2025 Delhi Severe+ Crisis"** → sidebar **Incident War
Room** (pipeline auto-runs) → sidebar **72H Predictions** → sidebar **City
Analytics** (Official CPCB Feed panel) → closing card.

---

### Scene 1 — The Hook (0:00-0:15)
*Black screen, white text cards, no app yet.*

> "1.67 million Indians die every year from air pollution."
> [beat]
> "India already has the emergency playbook — GRAP. Its own rules say stages shall be invoked *in advance*, on forecasts."
> [beat]
> "Last winter, 13 of 17 GRAP invocations were reactive. The response came *after* the smog."
> [beat]
> "VayuDrishti runs the playbook on time."

*[Logo + tagline: "From reactive monitoring to forecast-triggered intervention."]*

### Scene 2 — Enter the crisis (0:15-0:30)
*App open on the Command Center. In the sidebar, under the **Scenario** label, click
the card **"Dec 2025 Delhi Severe+ Crisis"**. The HISTORICAL REPLAY banner appears
and the whole platform re-scopes to 12 Dec 2025; Delhi's map goes dark red.*

> "This is December 2025 — the real Delhi Severe-plus episode, replayed. Anand Vihar
> peaked at 644. Every panel you'll see is honestly labelled HISTORICAL REPLAY — a
> reconstruction calibrated to the real reported peaks, and every number on screen
> carries a provenance badge."

### Scene 3 — The War Room: signal to intervention (0:30-1:45)
*Sidebar → **Incident War Room**. The six-step pipeline starts running for the worst
station; step icons light up one by one. Let it play, narrating over each step.*

*Step 1 · Signal (≈0:30-0:40):*
> "The war room locks onto the worst signal — Anand Vihar, already Severe and
> climbing. The 48-to-72-hour forecast sees the build-up before the peak lands."

*Step 2 · Source attribution — show the CPF pollution rose (≈0:40-0:52):*
> "Why is it happening? Not a guess: CPF wind-sector probabilities — the openair
> receptor-modelling method — over priors calibrated to published Delhi PMF studies.
> Every covariate is source-labelled. Zero random inputs."

*Step 3 · Causal trace — the back-trajectory animates across Punjab (≈0:52-1:04):*
> "And here's the receipt. A back-trajectory traces this air mass 570 kilometres —
> it crossed 10 active Punjab and Haryana fires in the 17 hours before reaching the
> station."

*Step 4 · Drafted response — the GRAP order (≈1:04-1:18):*
> "So the platform drafts the response — the actual CAQM Stage IV order, with the
> real statutory checklist: truck entry ban, construction halt, classes online —
> each action tagged to its responsible agency. Drafted roughly 14 to 36 hours
> before the projected crossing — 24 to 48 hours before the real order came on
> 13 December. And it records exactly which signal triggered it. No black box."

*Step 5 · Human impact (≈1:18-1:28):*
> "What's at stake, in human terms: 4.78 million people across these stations,
> about 13 excess deaths per day at episode levels — computed from cited AQLI and
> WHO coefficients, capped at their validated ranges, sources on screen."

*Step 6 · Citizens alerted — click **"Dispatch voice advisory (हिंदी)"**; let the
Hindi TTS play for ~4 seconds, then stop (≈1:28-1:38):*
> "And citizens don't read a dashboard — they hear it, in their own language.
> Six languages. CPCB's own app is English-only."

*Zoom on the signal → intervention counter next to the government-lag card (≈1:38-1:45):*
> "Total time from signal to drafted intervention: seconds. The documented
> government lag in November 2025: more than 24 hours."

### Scene 4 — The metrics (1:45-2:15)
*Sidebar → **72H Predictions**. Zoom on the **"Skill vs Persistence"** panel.*

> "None of this works if the forecast doesn't. Evaluated the way the problem
> statement demands — against a naive persistence baseline, on a chronological
> holdout: at 24 hours, RMSE 13.83 versus 19.00 — 27 percent better. At 48 hours,
> 28 percent. At 72, nearly 27. One XGBoost model per horizon, and every forecast
> explains itself with exact TreeSHAP."

*Brief text overlay while still on this screen:*
> **Skill vs persistence: +27.2% / +28.4% / +26.6% · Lead time: ~14-36 h · 4.78M people covered**

### Scene 5 — Scale (2:15-2:30)
*Sidebar → **City Analytics**. Scroll to the **"Official CPCB Feed · data.gov.in"**
panel showing live national records.*

> "Scaling isn't a promise — it's running. This is the official data.gov.in CPCB
> feed, live: 3,500 records, 500-plus stations nationwide. Onboarding a city is a
> config entry. The roadmap: all 131 NCAP non-attainment cities — today only 8 of
> them have any early warning at all."

### Scene 6 — Close (2:30-2:45)
*Final card, dark background, white text.*

> "The government already wrote the playbook. VayuDrishti runs it on time.
> Forecast. Order. Evidence. Impact. A voice in your own language — in seconds,
> not days."

*[Logo + GitHub URL + team name]*

---

## Notes for the person recording

- Record at 1080p; OBS Studio works well. Total runtime target 2:45 — hard cap 3:00.
- **Zero live dependencies in Scenes 2-4:** the replay seeds everything, advisories
  come from cache/templates (no Gemini call on the critical path), and the voice is
  browser-native TTS (no quota). If the machine is fully offline, Scene 5's
  data.gov.in panel will show its fallback state — record Scene 5 with internet, or
  point at the panel's provenance label and say "live when connected."
- Read on-screen numbers as rendered at recording time (forecast values vary with
  the replay moment). The numbers scripted above that are safe to say verbatim:
  1.67M, 13/17, 644, 570 km / 10 fires / 17 h, 14-36 h, 24-48 h, 4.78M, ~13
  deaths/day, 13.83/19.00, +27.2/+28.4/+26.6%, 3,500 records, 500+, 131, 8.
- If the War Room pipeline finishes faster than the narration, pause on each step's
  card — the step panels persist after completion.
- Keep the HISTORICAL REPLAY banner in frame at all times during Scenes 2-4; if a
  judge asks whether the demo is faked, the answer is on screen.
