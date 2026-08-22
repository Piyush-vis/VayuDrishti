# AGENTS.md — Global Agent Directives & Engineering Standards

This file is automatically loaded into the agent context on every turn. It establishes non-negotiable operational rules, coding standards, design aesthetics, and communication guidelines for this repository across all models (Gemini, Claude, GPT, etc.).

---

## 1. Repository Non-Negotiable Rules (R1 – R13)

- **R1 — Nothing is "done" until it has been run**: A feature is complete only after verifying it end-to-end: curl API routes, run frontend build, execute `pytest backend/tests/ -q`. Never claim completion based on code inspection alone.
- **R2 — Test against real MongoDB**: Verify database changes with the dockerized Mongo running (`docker-compose up -d mongodb`). The in-memory mock can hide Motor/ObjectId nuances.
- **R3 — Honesty in all claims**: Every metric in docs/README must be reproducible. Clearly label simulated/fallback data as such.
- **R4 — Deterministic fallbacks**: The application must remain fully functional with zero API keys and zero internet connection (simulator, statistical forecaster, heuristic templates, TF-IDF RAG).
- **R5 — Protect LLM quota**: Never call external LLMs in test loops or startup paths. Cache LLM outputs in Mongo.
- **R6 — Never expose secrets**: Never print, echo, or log `.env` contents, API keys, or credentials into tool outputs, logs, or commits.
- **R7 — Protect the one-command demo**: `docker-compose up --build` must always work smoothly from a clean state.
- **R8 — Additive, not destructive**: Prefer adding modules/routes over refactoring working ones. Never rename or move working files for aesthetics.
- **R9 — Respect degradation ladders**: Advisory (Agent → Gemini → Templates), Forecast (XGBoost → Statistical), RAG (ChromaDB → TF-IDF), Ingestion (AQICN → OpenWeatherMap → Simulator).
- **R10 — Windows-safe workflows**: Dev environment is Windows/PowerShell (cp1252 console). Write UTF-8 files for non-ASCII characters. Use `backend\venv\Scripts\python.exe` explicitly. Kill stale port processes before restarts.
- **R11 — Timebox by plan.md tiers**: Complete Tier-1 features before Tier-2. If a feature takes 2x the timebox, ship the graceful fallback, record in `MEMORY.md`, and move forward.
- **R12 — Log decisions**: Record key architectural or scope decisions in `MEMORY.md`.
- **R13 — Commits require user sign-off**: Ask before committing. Never commit `.env`, `venv/`, `node_modules/`, `chroma_db/`, or `__pycache__/`.

---

## 2. Karpathy & Ponytail Engineering Principles

- **Think Before Coding**: Clarify ambiguities, state assumptions, and identify edge cases before writing code.
- **Simplicity First (YAGNI)**: Think like the laziest senior engineer. Prefer native platform APIs and standard libraries over heavy dependencies. Write minimal, clean, readable code.
- **Surgical Edits**: Touch only what is strictly necessary. Never reformat untouched lines or delete unrelated comments.
- **Goal-Driven Execution**: Formulate atomic step-by-step verification steps before modifying code.

---

## 3. UI/UX Excellence & Impeccable Design Standards

- **Zero "AI Slop"**: No generic purple-to-blue gradients, no default unstyled Inter fonts, no nested card clutter, no low-contrast text.
- **Rich Aesthetics**: Tailored HSL color palettes (60-30-10 distribution), Bento Grid layouts, micro-interactions (`active:scale-[0.98]`, subtle hover elevations), and polished glassmorphic surfaces (`backdrop-filter: blur(12px)`).
- **Accessible & Responsive**: WCAG AA contrast compliance, responsive mobile/tablet/desktop breakpoints, custom-styled scrollbars and form controls.

---

## 4. Communication & Execution Style (Caveman / High Density)

- **Zero Filler**: Skip conversational fluff, generic pleasantries, and self-narrating recaps.
- **Direct & Actionable**: Provide immediate code diffs, command outputs, and concise analysis.
- **Clickable File Links**: Always use markdown links in `[filename](file:///absolute/path/to/file)` format.

---

## 5. Active Workspace Skills

Specialized on-demand skills are located in `.agents/skills/`:
- **UI/UX Pro Max**: Design systems, Bento grids, color palettes, and component templates (`.agents/skills/ui-ux-pro-max/SKILL.md`).
- **Understand-Anything**: Codebase architecture visualizer and Mermaid diagram generator (`.agents/skills/understand-anything/SKILL.md`).
- **Graphify**: Codebase dependency and knowledge graph builder (`.agents/skills/graphify/SKILL.md`).
- **Document Tools**: Word, Excel, PDF generation and data manipulation (`.agents/skills/document-tools/SKILL.md`).
- **Plan Challenger**: Adversarial plan evaluation and edge-case stress testing (`.agents/skills/plan-challenger/SKILL.md`).
