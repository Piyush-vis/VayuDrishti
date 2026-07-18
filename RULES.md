# RULES.md — Non-Negotiable Rules for All Agents on This Repo

These rules exist because violating each one has already cost us time or credibility
once. They are not style preferences. If a task appears to require breaking one, stop
and ask the user instead.

## R1 — Nothing is "done" until it has been run
A feature is complete only when you have exercised it end-to-end: the API route
returns the right data (curl it), the UI renders it (build passes at minimum), and
`pytest backend/tests/ -q` is green. "The code looks right" has produced multiple
production 500s in this repo (import-path crash, ObjectId serialization, NameError on
5 of 8 cities). Never report completion on inspection alone.

## R2 — Test against real MongoDB, not just the mock
The in-memory mock hides real Motor behaviors (mutation on insert, ObjectId types,
query operators). Any change that touches the DB layer must be verified with the
dockerized Mongo running. `docker-compose up -d mongodb` is cheap — use it.

## R3 — Honesty in all judged claims
Every number in the README/docs/pitch (RMSE, % improvement, "live data", "real-time")
must be reproducible from this repo. Simulated data must be labeled as simulated in
code and honest in docs (the physically-grounded simulator is a fallback, and we say
so). Judges who catch one inflated claim discount everything else. This is a hard line.

## R4 — Every AI feature keeps a working deterministic fallback
The app must remain fully demoable with ZERO API keys and ZERO network access:
simulator ingestion, statistical forecaster, template advisories, rule-based
enforcement, TF-IDF RAG. Never ship a feature whose failure mode is a spinner or a
stack trace. If Gemini is down mid-demo, the demo must not care.

## R5 — Protect the Gemini quota
Free-tier quota is ~20 requests/day on some models and 429s have already occurred.
Do not call Gemini in test loops, retries without backoff, or startup paths. Cache
every reusable LLM output in Mongo (existing patterns: advisories cached 1h,
enforcement analyses cached on the document). Before demo recording, the user should
have a fresh/paid key — flag this, don't assume it.

## R6 — Never expose secrets
Do not print, cat, or echo `backend/.env` or any key value into command output,
logs, commits, or docs. Keys have leaked into tool transcripts twice already and the
user was advised to rotate. `.env` stays gitignored; `.env.example` carries only
placeholders.

## R7 — Do not break the one-command demo
`docker-compose up --build` from a fresh clone must always yield a working app. That
property is a graded deliverable. Changes to Dockerfiles, compose, requirements, or
import structure require re-verifying the compose path before done. Keep
`.dockerignore` intact (the build context was once 1.6GB without it).

## R8 — Additive, not destructive
With <4 days to deadline, working code is sacred. Prefer adding modules/routes over
refactoring working ones. No renames/moves of working files for aesthetics. No
dependency version bumps unless a feature requires it (versions are pinned and the
Docker image is verified against them).

## R9 — Respect the existing degradation ladders
Advisory: agent → raw Gemini → templates. Forecast: XGBoost → statistical. RAG:
ChromaDB → TF-IDF. Ingestion: AQICN → OpenWeatherMap → simulator. New features must
slot into a ladder, never replace the bottom rung.

## R10 — Windows-safe workflows
Dev box is Windows/PowerShell, console is cp1252. Never print non-ASCII (Indic
scripts) to stdout in scripts — write UTF-8 files. Use `backend\venv\Scripts\python.exe`
explicitly. Foreground processes holding ports must be killed before restarts.

## R11 — Timebox by plan.md tiers
Work strictly in tier order from `plan.md`. A Tier-1 feature at 80% beats two Tier-2
features at 100%. If a feature exceeds its timebox by 2x, stop, ship the graceful
fallback, log the cut in MEMORY.md, and move on. The deadline does not move.

## R12 — Log decisions
Any non-obvious decision (cut feature, changed approach, discovered constraint) gets
one line in `MEMORY.md` under Decisions with the date. Future agents must not re-argue
settled questions or re-hit known landmines.

## R13 — Commits require user sign-off
Ask before committing. When the user agrees, commit granular working milestones with
clear messages. Never commit: `.env`, `venv/`, `node_modules/`, `chroma_db/`,
`__pycache__/`, model binaries beyond the existing `saved_models/` pattern.
