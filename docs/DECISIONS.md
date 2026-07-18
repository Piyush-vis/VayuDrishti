# DECISIONS.md — Architecture Decision Records (ADR-lite)

Longer-form rationale for the big calls. One section per decision; newest first.
Summary table lives in `MEMORY.md`; this file carries the "why" in enough depth that
nobody needs to re-derive it.

---

## ADR-7 (2026-07-19): Stay on PS5 rather than switching problem statements

**Context.** With 3.5 days to deadline, the user asked whether another of the 8
problem statements offers a better chance of winning.

**Decision.** Stay on PS5 (Urban Air Quality Intelligence). Invest remaining time in
differentiators, not a restart.

**Rationale.**
1. *Data reality.* PS5 is the only PS where the prototype can run on real, live,
   free data (AQICN/CPCB, Open-Meteo, NASA FIRMS, TomTom, satellite). PS1
   (plant sensors/SCADA), PS2 (AIS vessel feeds), PS3 (BMS/battery telemetry), PS4
   (EPC project document corpora), PS6 (currency images, scam-call data), PS7
   (enterprise telemetry), PS8 (proprietary industrial documents) all force a
   ~100% fabricated demo. Judges discount simulated-only demos, and the PS5
   evaluation focus explicitly rewards real-data metrics (RMSE vs persistence).
2. *Sunk advantage that transfers.* We already have a verified working platform with
   the exact required capabilities plus real agents and a baseline-beating model —
   an estimated 70-80% of total build effort. No other PS lets us reuse more than
   scraps of it.
3. *Emotional resonance.* Air quality is personally felt by every judge; 1.67M
   deaths/year is the strongest opening statistic across all 8 PS briefs.
4. *Competition density is a wash.* PS5 likely attracts many teams, but most will
   ship a map+chatbot dashboard; our differentiation plan (plan.md) targets exactly
   that gap. A less-crowded PS with a fabricated demo is a worse trade.

**Consequences.** All remaining effort goes to plan.md's tiered differentiators, demo
credibility, and submission polish.

---

## ADR-6 (2026-07-18): Tool-calling agents built on langchain-core primitives

**Decision.** `services/agents.py` implements a minimal ReAct loop directly over
`ChatGoogleGenerativeAI.bind_tools()` + message types, instead of `langchain.agents`
high-level APIs (AgentExecutor / create_react_agent) or LangGraph.

**Rationale.** The high-level agent APIs changed shape across LangChain 0.2 → 0.3 →
1.0; installed resolution is LC 1.3.x where legacy AgentExecutor patterns are
deprecated. The bind_tools loop is ~40 lines, version-stable, fully inspectable, and
lets us normalize Gemini's list-shaped message content in one place. Genuine
multi-step tool orchestration is preserved (model chooses tools, observes, iterates).

**Consequences.** We describe the architecture honestly as "LangChain tool-calling
agents with a custom orchestration loop." Adding a tool = one `@tool` function +
appending to the agent's tool list.

---

## ADR-5 (2026-07-18): Offline model training; runtime loads artifact only

**Decision.** `backend/ml/train_model.py` is run manually; `prediction.py` only loads
the saved joblib and falls back to the statistical forecaster if absent.

**Rationale.** The previous import-time auto-train ran before DB init, couldn't
guarantee a stable chronological dataset, and made startup nondeterministic. Offline
training also lets us quote fixed, reproducible metrics in the submission.

---

## ADR-4 (2026-07-18): Training data = accumulated real readings, else physically-grounded simulator bootstrap

**Decision.** Training prefers real accumulated DB readings (≥3000 rows); otherwise
bootstraps 120 days from the same simulator used by live ingestion (diurnal traffic,
overnight inversion, city/station profiles, weather correlation), with real
lag/rolling features and a chronological train/test split either way.

**Rationale.** The original trainer drew independent random features and fit an
invented linear formula — the reported RMSE was meaningless and indefensible under
judge questioning. The simulator bootstrap keeps feature-target relationships
physically plausible and the persistence-baseline comparison honest (both models see
the same series). Docs disclose the bootstrap path explicitly.

---

## ADR-3 (2026-07-18): Graceful-degradation ladders as an architectural invariant

**Decision.** Every capability has a no-key, no-network bottom rung: simulator
ingestion; statistical forecaster; template advisories (6 languages); rule-based
enforcement; TF-IDF RAG; in-memory mock DB. Codified as RULES.md R4/R9.

**Rationale.** Demo resilience (nothing depends on third parties during recording or
judging) and honest "works on fresh clone with zero config" claim — worth Technical
Excellence points and eliminates the largest class of demo-day failure.

---

## ADR-2 (2026-07-08→18): Single-repo FastAPI + React + Mongo, docker-compose deploy

**Decision.** Monolithic API service (routers/services layering) with one React SPA;
no microservices, no k8s, no cloud deployment for the submission.

**Rationale.** Solo developer + deadline; compose is a graded "one command" story;
scalability narrative is handled at the data-model level (city-keyed everything,
station-agnostic pooled model) rather than infrastructure theater.

---

## ADR-1 (2026-07-08): Problem statement PS5 and product identity "VayuDrishti"

**Decision.** Build for PS5 with a government-command-center product identity (dark
mode, evidence-first UI) targeting CPCB/municipal users, plus a citizen advisory
surface.

**Rationale.** See ADR-7 (re-confirmation with full comparison); original selection
reasoning in `et_hackathon_strategy.md` Sections 1-3.
