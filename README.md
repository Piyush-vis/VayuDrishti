# VayuDrishti (वायुदृष्टि) — Urban Air Quality Intelligence Platform

VayuDrishti is an AI-powered environmental command center designed for Indian municipal corporations, environmental enforcement agencies (like the CPCB), and smart city administrative bodies. It moves urban air quality management from **reactive monitoring to proactive, evidence-based intervention**.

Built for the **ET AI Hackathon 2.0 (Phase 2)**.

---

## 🌟 Key Differentiators (Why VayuDrishti Wins)

1. **Multi-Agent Intelligence Platform:** Fuses predictions, attribution, advisories, and enforcement actions rather than just displaying static AQI charts.
2. **Live Ground-Truth Data:** Pulls real-time air quality metrics via AQICN/CPCB station networks and local meteorological conditions from the Open-Meteo API.
3. **Autoregressive 72H Predictions:** Implements a recursive XGBoost forecasting model with compounding 80% confidence bands representing predictive uncertainty over time.
4. **Geospatial Source Attribution:** Rule-based ML attribution engine correlating AQI patterns against localized traffic congestion, active NASA thermal fire anomalies, and industrial clusters.
5. **Generative Multi-lingual Advisories:** Harnesses Gemini 1.5 Flash to write concise public health warnings in **6 regional Indian languages** (English, Hindi, Tamil, Kannada, Bengali, Telugu).
6. **Administrative Enforcement Desk:** Priority-ranked action workflows (inspections, water spraying, traffic rerouting) backed by robust meteorological and wind-direction evidence.
7. **Compliance RAG Chatbot:** Local TF-IDF + ChromaDB vector database allowing administrators to query CPCB National Ambient Air Quality Standards (NAAQS) and NCAP targets.
8. **Automatic Seeding:** Automatically generates 7 days of realistic historical hourly readings on first startup so charts are fully populated instantly.

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
│   ├── services/                # Core engines (ingestion, RAG, predict, attribution)
│   ├── models/                  # Database connections & validation schemas
│   ├── ml/                      # XGBoost training script and serialized weights
│   └── data/                    # Seed configurations and RAG text documents
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
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. React Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📡 API Reference Schema

All routes are prefixed with `/api/v1`.

| Method | Endpoint | Description |
|---|---|---|
| **GET** | `/stations` | List all active monitoring stations in the active city |
| **GET** | `/stations/{id}/readings` | Fetch recent 24-168 hours sensor reading logs |
| **GET** | `/aqi/current` | Get latest AQI, PM2.5, PM10, meteorological data |
| **GET** | `/aqi/heatmap` | Retrieve coordinates + values formatted for map heat overlays |
| **GET** | `/aqi/compare` | Compare current air pollution averages across multiple metro cities |
| **GET** | `/predict/forecast` | Run recursive XGBoost 72-hour AQI prediction with confidence ranges |
| **GET** | `/predict/alerts` | Get list of stations predicted to breach threshold of AQI 300 |
| **GET** | `/attribution/sources` | Retrieve percentage breakdown of vehicular, industrial, and crop fire |
| **GET** | `/enforcement/actions` | Query ranked priority actions with spatial/meteorological evidence |
| **PATCH**| `/enforcement/actions/{id}`| Dispatch patrols or mark compliance actions as resolved |
| **GET** | `/advisory/citizen` | Retrieve multilingual warning cards in 6 Indian languages |
| **POST**| `/chat/query` | Ask compliance questions querying NAAQS and NCAP policies via RAG |

---

## 👥 Submission Team Details

- **Project:** VayuDrishti (वायुदृष्टि)
- **Competition:** Economic Times AI Hackathon 2.0
- **Submission Type:** Prototype Source Code & Walkthrough
