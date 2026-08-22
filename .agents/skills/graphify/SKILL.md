---
name: graphify
description: >-
  Codebase relationship and knowledge graph mapper. Use when navigating unfamiliar codebases,
  mapping component dependencies, tracing API-to-database call graphs, or analyzing blast radius for refactors.
---

# Graphify — Codebase Relationship & Dependency Mapper

This skill maps the semantic relationships, import hierarchies, and runtime call paths across the project into [CODEBASE_GRAPH.md](file:///c:/Users/pvgam/Documents/python_projects/ET%20Hackathon%20vibe%20coded/CODEBASE_GRAPH.md).

---

## 1. Automated Graph Generation

To refresh or rebuild the entire codebase graph after modifying code:

```powershell
python .agents/skills/graphify/scripts/build_graph.py
```

This updates [CODEBASE_GRAPH.md](file:///c:/Users/pvgam/Documents/python_projects/ET%20Hackathon%20vibe%20coded/CODEBASE_GRAPH.md) in seconds with all new routers, endpoints, service functions, and frontend components.

---

## 2. Graph Structure & Contents

[CODEBASE_GRAPH.md](file:///c:/Users/pvgam/Documents/python_projects/ET%20Hackathon%20vibe%20coded/CODEBASE_GRAPH.md) tracks:
1. **High-Level System Architecture**: End-to-end Mermaid diagram of Frontend, FastAPI Backend, ML Pipelines, and Storage.
2. **API Endpoint Route Map**: All FastAPI routes (`GET`, `POST`, `PATCH`, `DELETE`) with exact paths and file locations.
3. **Backend Service Matrix**: Key functions, database querying layers, and fallback handlers.
4. **Frontend Page & Component Hierarchy**: Breakdown of `pages/` and categorized `components/` (charts, panels, maps, layouts).
5. **API Client Call Graph**: Mapping `frontend/src/services/api.js` methods to backend endpoints.
6. **Degradation Ladders**: Multi-agent to template fallback, live-to-simulator ingestion fallback, and ML-to-statistical forecast fallback.
