---
name: understand-anything
description: >-
  Visual codebase understanding and architecture mapping. Use when explaining system architecture,
  generating Mermaid diagrams, mapping data flows, analyzing complex modules, or creating visual onboarding tours.
---

# Understand-Anything Architecture Visualizer

This skill turns complex codebases into intuitive, visual architecture maps and diagrams using Mermaid.js and structured flow charts.

---

## 1. System Architecture Mapping Workflow

When asked to explain, analyze, or visualize a system:

1. **Identify the Core Architectural Layers**:
   - **Ingestion & Data Sources**: Raw APIs, sensors, scrapers, message queues.
   - **Domain & Processing Engines**: Forecasters, ML models, heuristic calculators, background workers.
   - **State & Storage**: Databases (MongoDB, PostgreSQL), Caches (Redis), Vector stores (ChromaDB).
   - **API & Gateway Layer**: FastAPI/Express endpoints, auth middlewares, validation schemas.
   - **Frontend & Presentation**: Client dashboards, map renderers, live charts, interactive controls.

2. **Render High-Clarity Mermaid Diagrams**:
   - Always wrap node labels with quotes if they contain special characters.
   - Group related components into subgraphs.
   - Annotate arrows with protocols (HTTP, WS, gRPC) and data types.

---

## 2. Standard Diagram Templates

### Layered Architecture Diagram
```mermaid
graph TD
    subgraph Client["Frontend Client (React/Vite)"]
        UI[Interactive UI Dashboard]
        Map[Deck.gl / MapLibre Layer]
        Charts[ECharts / Recharts]
    end

    subgraph API["API Gateway & Services (FastAPI)"]
        Routes[API Endpoints]
        Engine[Analytical & Forecasting Engine]
        RAG[RAG Advisory Agent]
    end

    subgraph Storage["Data Tier"]
        DB[(MongoDB Database)]
        VectorDB[(ChromaDB Vector Store)]
        Cache[(Local/In-Memory Cache)]
    end

    UI -->|REST / WebSocket| Routes
    Routes --> Engine
    Routes --> RAG
    Engine --> DB
    RAG --> VectorDB
```

### Data Pipeline & Degradation Flow
```mermaid
flowchart LR
    A[Data Ingestion Request] --> B{Primary Source Live?}
    B -->|Yes| C[Fetch Real-Time Telemetry]
    B -->|No - 429/Timeout| D[Switch to Secondary API]
    D -->|Fail| E[Deterministic Physics Simulator]
    C --> F[Store in DB & Compute Metrics]
    D --> F
    E --> F
    F --> G[Serve to Frontend Client]
```

### Sequence Diagram
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend
    participant Backend as FastAPI Backend
    participant Mongo as MongoDB
    participant ML as ML Forecast Engine

    User->>Frontend: Request City AQI Forecast
    Frontend->>Backend: GET /api/forecast?city=Delhi
    Backend->>Mongo: Check cached forecast (TTL: 1h)
    alt Cache Hit
        Mongo-->>Backend: Return cached prediction
    else Cache Miss
        Backend->>ML: Run XGBoost model inference
        ML-->>Backend: Forecast array + confidence bounds
        Backend->>Mongo: Store computed forecast
    end
    Backend-->>Frontend: 200 OK (JSON forecast data)
    Frontend-->>User: Render animated trend charts
```
