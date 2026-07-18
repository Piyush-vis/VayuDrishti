# VayuDrishti (वायुदृष्टि) — Urban Air Quality Intelligence Platform

VayuDrishti is an AI-powered environmental command center designed for Indian municipal corporations, environmental enforcement agencies (like the CPCB), and smart city administrative bodies. It moves urban air quality management from **reactive monitoring to proactive, evidence-based intervention**.

Built for the **ET AI Hackathon 2.0 (Phase 2)**.

---

## 🌟 Key Differentiators (Why VayuDrishti Wins)

1. **Genuine Tool-Calling Multi-Agent Layer:** Two LangChain agents (`backend/services/agents.py`) built on real `bind_tools()` + ReAct-style loops, not single hand-written prompts. The **Compound Risk Enforcement Agent** independently pulls source-attribution and forecast-trend data via tools before judging whether a breach is a genuine compound risk; the **Citizen Advisory Agent** looks up nearby hospitals/schools/outdoor-worker zones itself when conditions are severe. Both degrade gracefully to deterministic rule-based logic if no Gemini key is configured.
2. **Live Ground-Truth Data:** Pulls real-time air quality metrics via the AQICN/CPCB station network and local meteorological conditions from the Open-Meteo API.
3. **Autoregressive 72H Predictions, Trained on Real Time-Series Features:** A recursive XGBoost forecaster (`backend/ml/train_model.py`) trained on actual lag/rolling features engineered from accumulated station history (chronological train/test split, no leakage) - not independent random draws. Beats a naive persistence baseline (RMSE 14.3 vs 19.4, +26% improvement) on held-out data, with compounding 80% confidence bands.
4. **Geospatial Source Attribution:** Rule-based attribution engine correlating AQI patterns against localized traffic congestion, active NASA FIRMS thermal fire anomalies, and industrial clusters across all 8 covered cities, with circular-mean wind direction evidence.
5. **Generative Multi-lingual Advisories:** The Citizen Advisory Agent writes concise public health warnings in **6 regional Indian languages** (English, Hindi, Tamil, Kannada, Bengali, Telugu), grounded in real Gemini tool calls rather than static templates when a key is configured.
6. **Administrative Enforcement Desk:** Priority-ranked action workflows (inspections, water spraying, traffic rerouting) backed by meteorological and wind-direction evidence, with an on-demand AI compound-risk analysis button per action.
7. **Compliance RAG Chatbot:** ChromaDB vector database (with a hand-rolled TF-IDF fallback) letting administrators query CPCB National Ambient Air Quality Standards (NAAQS) and NCAP targets, also used as a tool by the Enforcement Agent to ground its recommendations.
8. **Automatic Seeding:** Automatically generates 7 days of realistic historical hourly readings on first startup so charts are fully populated instantly, with zero required configuration (falls back to an in-memory mock database if MongoDB isn't reachable).

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        VAYUDRISHTI PLATFORM                              │
│                                                                          │
│  ┌─────────────────── DATA LAYER ───────────────────────────────────┐   │
│  │                                                                    │   │
│  │  AQICN API  ──┐                                                    │   │
│  │  Open-Meteo ──┼── Data Ingestion Service ── MongoDB (Time-Series)  │   │
│  │  TomTom/OSM ──┤      (scheduled jobs)         ↓                    │   │
│  │  NASA FIRMS ──┘                          ChromaDB (RAG docs)       │   │
│  │                                                                    │   │
│  └────────────────────────┬──────────────────────────────────────────┘   │
│                           │                                               │
│  ┌─────────────────── INTELLIGENCE LAYER ───────────────────────────┐   │
│  │                        │                                           │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │   │
│  │  │ Prediction   │ │ Source       │ │ Agent Orchestrator       │  │   │
│  │  │ Engine       │ │ Attribution  │ │ (LangChain / GenAI)      │  │   │
│  │  │              │ │ Engine       │ │                          │  │   │
│  │  │ XGBoost      │ │              │ │ • Citizen Advisory Agent │  │   │
│  │  │ trained on   │ │ ML clustering│ │ • Enforcement Agent      │  │   │
│  │  │ historical   │ │ + geospatial │ │ • Anomaly Detection      │  │   │
│  │  │ AQI+weather  │ │ correlation  │ │ • RAG Query Agent        │  │   │
│  │  │              │ │              │ │                          │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────────────┘  │   │
│  │                                                                    │   │
│  └────────────────────────┬──────────────────────────────────────────┘   │
│                           │                                               │
│  ┌─────────────────── PRESENTATION LAYER ───────────────────────────┐   │
│  │                        │                                           │   │
│  │  React 19 + Vite + Tailwind CSS                                    │   │
│  │  ├── Interactive Map (Leaflet.js + OpenStreetMap)                  │   │
│  │  ├── Prediction Dashboard (Recharts Area with Confidence Range)      │   │
│  │  ├── Source Attribution Panel (Pie/Bar charts)                     │   │
│  │  ├── Citizen Advisory Panel (multi-language cards)                 │   │
│  │  ├── Enforcement Command Center (priority action list)            │   │
│  │  └── City Comparison View & Policy Chat Panel                      │   │
│  │                                                                    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system diagram, the reasoning
behind each design decision, and an end-to-end trace of a compound-risk detection.

---

## 🛠️ Project Directory Tree

```
vayudrishti/
├── backend/
│   ├── main.py                  # FastAPI app entry point and lifecycle
│   ├── config.py                # Environment configuration setting loaders
│   ├── requirements.txt         # Backend Python package lock
│   ├── Dockerfile               # Slim Python multi-stage container build
│   ├── routers/                 # API Routes (aqi, predict, chat, advisory, etc.)
│   ├── services/                # Core engines (ingestion, RAG, predict, attribution, agents)
│   ├── models/                  # Database connections & validation schemas
│   ├── ml/                      # XGBoost training script and serialized weights
│   ├── data/                    # Seed configurations and RAG text documents
│   └── tests/                   # Pytest regression suite
├── frontend/
│   ├── package.json             # Locked UI dependencies
│   ├── tailwind.config.js       # Design system colors, fonts, theme extensions
│   ├── postcss.config.js        # PostCSS directives
│   ├── Dockerfile               # Alpine Node static server dev container
│   ├── index.html               # Main entry HTML with SEO metadata
│   └── src/                     # React application sources
│       ├── main.jsx             # Root mount initializer
│       ├── App.jsx              # Routing, layout assembly, and state hooks
│       ├── index.css            # Stylesheets, animations, map dark theme overrides
│       ├── components/          # Reusable Map, Charts, and Panels elements
│       └── services/            # Axios API client requests catalog
├── docker-compose.yml           # Multi-container service (mongodb + backend + frontend)
├── ARCHITECTURE.md              # Full system diagram + design rationale
├── LICENSE                      # MIT
├── docs/
│   ├── DETAILED_DOCUMENT.md     # Submission document draft (problem, solution, methodology)
│   ├── PRESENTATION_DECK.md     # 10-12 slide outline for Phase 3
│   └── DEMO_SCRIPT.md           # 3-4 minute demo video script, verified against the running app
└── README.md                    # Core submission guide
```

---

## 🚀 Quick Start (Docker Orchestration)

To launch the complete application stack (MongoDB Database + Python FastAPI Backend + React Frontend) with one single command:

1. Clone or navigate to the repository directory.
2. Create a `.env` file under the `backend/` folder (or copy `backend/.env.example`). You can leave API keys blank to run in simulated fallback mode instantly!
3. Run:
   ```bash
   docker-compose up --build
   ```
4. Access the applications:
   - **Frontend UI Dashboard:** http://localhost:5173
   - **FastAPI Documentation:** http://localhost:8000/docs
   - **MongoDB Port:** http://localhost:27017

---

## 💻 Manual Local Installation

If you prefer to run the components independently:

### 1. Database
Ensure a local MongoDB server is running on `mongodb://localhost:27017` or configure your `MONGODB_URI` environment variable.

### 2. FastAPI Backend
Run these from the **repository root** (the backend package uses absolute `backend.` imports, so it must be launched as a package from one level above `backend/`):
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 3. React Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. (Optional) Retrain the prediction model
A pre-trained model ships in `backend/ml/saved_models/`. To retrain it - e.g. after the
database has accumulated real ingested history, or to regenerate the bootstrap version -
run from the repository root:
```bash
python -m backend.ml.train_model
```
This prefers real accumulated readings from MongoDB; if there isn't enough yet, it
bootstraps from the same physically-grounded diurnal/weather simulator that powers live
data seeding, builds real lag/rolling time-series features, and reports RMSE against a
naive persistence baseline (the exact metric this problem statement's evaluation focus
asks for) using a chronological train/test split.

### 5. Running tests
```bash
python -m pytest backend/tests/ -v
```
Covers the AQI sub-index math (including a round-trip check for the AQICN
sub-index-to-concentration inversion), the industrial-attribution catalog across all 8
covered cities, circular-mean wind direction, and the ML feature engineering pipeline's
lag/rolling/target correctness.

---

## 📡 API Reference Schema

All routes are prefixed with `/api/v1`.

| Method | Endpoint | Description |
|---|---|---|
| **GET** | `/stations` | List all active monitoring stations in the active city |
| **GET** | `/stations/{id}/readings` | Fetch recent 24-168 hours sensor reading logs |
| **GET** | `/aqi/current` | Get latest AQI, PM2.5, PM10, meteorological data |
| **GET** | `/aqi/at` | Get every station's real recorded reading closest to N hours ago (powers the map timelapse slider) |
| **GET** | `/aqi/history` | Get a station's historical readings between two ISO timestamps |
| **GET** | `/aqi/heatmap` | Retrieve coordinates + values formatted for map heat overlays |
| **GET** | `/aqi/compare` | Compare current air pollution averages across multiple metro cities |
| **GET** | `/predict/forecast` | Run recursive XGBoost 72-hour AQI prediction with confidence ranges |
| **GET** | `/predict/alerts` | Get list of stations predicted to breach threshold of AQI 300 |
| **GET** | `/attribution/sources` | Retrieve percentage breakdown of vehicular, industrial, and crop fire |
| **GET** | `/attribution/industrial` | Get the industrial-zone catalog and impact index for a city |
| **GET** | `/enforcement/actions` | Query ranked priority actions with spatial/meteorological evidence |
| **POST**| `/enforcement/actions/{id}/analyze` | Run the Compound Risk Enforcement Agent against a detected breach |
| **PATCH**| `/enforcement/actions/{id}`| Dispatch patrols or mark compliance actions as resolved |
| **GET** | `/advisory/citizen` | Retrieve multilingual warning cards in 6 Indian languages |
| **POST**| `/chat/query` | Ask compliance questions querying NAAQS and NCAP policies via RAG |

---

## 👥 Submission Team Details

- **Project:** VayuDrishti (वायुदृष्टि)
- **Competition:** Economic Times AI Hackathon 2.0
- **Submission Type:** Prototype Source Code & Walkthrough

---

## 📄 License

MIT — see [LICENSE](LICENSE).
