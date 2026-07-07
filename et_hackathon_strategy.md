# VayuDrishti — Complete Project Specification

> **This is the single source of truth for the ET AI Hackathon 2.0 Phase 2 submission.**
> Everything needed to build, understand, and demo this project is in this file.
> No other document is needed.

---

## SECTION 1: HACKATHON CONTEXT

### Competition: ET AI Hackathon 2.0
- **Organizer:** Economic Times + Unstop
- **Scale:** 70,000+ registrations, ~9,500 cleared Phase 1
- **Current Phase:** Phase 2 — Build Sprint (Prototype Submission)
- **Submission Deadline:** **22 July 2026, 11:59 PM IST**
- **Submission Platform:** Unstop (submit button appears on competition page)
- **Team Size:** 1-4 members

### What to Submit
1. **Detailed Document** (PDF) — problem analysis, solution design, architecture, tech stack, innovation, impact
2. **Demo Video** (3-4 minutes) — working prototype walkthrough
3. **GitHub URL** — complete source code with README
4. **Additional Files** — architecture diagrams, data samples, presentation deck

### Phase 3 (If Selected as Finalist)
- Top teams present to industry expert jury panel
- 10-15 minute live presentation + demo + Q&A
- Prizes: ₹5L (Winner), ₹3L (1st Runner-Up), ₹2L (2nd Runner-Up)
- **Pre-Placement Interviews** from global AI-first tech companies for top performers

### Judging Criteria
| Criteria | Weight | What judges look for |
|---|---|---|
| **Innovation** | 25% | Novel approach, not just a dashboard. Multi-agent architecture, unique algorithms |
| **Business Impact** | 25% | Real-world applicability, measurable outcomes, India-specific relevance |
| **Technical Excellence** | 20% | Clean architecture, proper engineering, not just API wrappers |
| **Scalability** | 15% | Can this work for 300+ cities? Horizontal scaling capability |
| **User Experience** | 15% | Production-grade UI, smooth interactions, intuitive design |

### What Previous Winners Built (Research)
- **ET GenAI Hackathon v1 Winner (2025):** 54,000 registrations → 20 finalists → 1 winner. Selected for "strong technical foundation, clear problem-solving approach, real-world relevance"
- **Masthishq (IIT Madras):** Multimodal AI cognitive prosthesis — YOLO + FaceNet + Qdrant + Llama 3 + dual-interface app
- **RiskWise (Microsoft Hackathon):** Supply chain risk analysis — Python + React/Next.js + Azure AI Agents + real-time data
- **Pattern:** Multi-agent AI + multimodal + real data + production-grade UI + India-specific impact

---

## SECTION 2: PROBLEM STATEMENT (PS 5 — Full Text)

### Title: AI-Powered Urban Air Quality Intelligence for Smart City Intervention
### Theme: Smart Cities / Environmental Intelligence / Geospatial Analytics / Public Health

### Problem Context
India's air quality crisis is a national urban crisis. In 2024-25, Delhi averaged AQI 218 (classified 'Poor' or worse for 200+ days). Mumbai recorded dangerous AQI on 60+ days. Bengaluru and Chennai have seen measurable deterioration. CPCB data shows 24 of India's 50 most polluted cities are Tier 1/2 urban centres. The Lancet estimated **1.67 million premature deaths annually** from air pollution in India.

Despite 900+ CAAQMS stations deployed under NCAP, a 2024 CAG audit found only **31% of cities with monitoring data had actionable multi-agency response protocols**. The data exists. The intelligence layer to act on it does not.

### Challenge Statement
Build an AI-powered Urban Air Quality Intelligence platform that fuses monitoring station data, satellite imagery, mobility feeds, meteorological forecasts, and geospatial land use layers to move from reactive monitoring to proactive, evidence-based intervention.

### What the PS Suggests Building
1. **Geospatial Pollution Source Attribution Engine** — Multi-modal AI correlating spatial-temporal AQI patterns against land use, traffic, industrial stacks, thermal anomalies. Source-level attribution at ward/zone level with confidence scores
2. **Hyperlocal Predictive AQI Forecasting Agent** — 24-72 hour AQI forecasts at 1km grid resolution integrating meteorology, traffic, seasonal emissions, atmospheric dispersion
3. **Enforcement Intelligence & Prioritisation Agent** — Correlating hotspots with registered emission sources, generating prioritized evidence-backed enforcement recommendations
4. **Multi-City Comparative Intelligence Dashboard** — Track/compare air quality trends and intervention effectiveness across cities
5. **Citizen Health Risk Advisory System** — Ward-level health alerts, vulnerability mapping (hospitals, schools, outdoor workers), multi-language advisories via mobile/IVR

### Suggested Technologies (from PS)
- Geospatial Intelligence & Remote Sensing (Sentinel, MODIS)
- Multi-Agent AI Systems
- Real-Time IoT Sensor Data Integration (CAAQMS)
- Atmospheric Dispersion Modelling
- Predictive Analytics
- LLMs for multi-language citizen communication

### Evaluation Focus (from PS)
- Source attribution accuracy vs ground-truth emission inventories
- AQI forecast accuracy at hyperlocal resolution (RMSE vs persistence baseline)
- Enforcement recommendation quality rated by domain experts
- Citizen advisory relevance and language coverage
- Demonstrated reduction in response time from signal to intervention

---

## SECTION 3: OUR SOLUTION — VAYUDRISHTI (वायुदृष्टि)

### Tagline
> AI-powered Urban Air Quality Intelligence Platform that sees, predicts, and acts on India's invisible killer.

### Why This Wins
1. **Every judge breathes polluted air** — personal emotional connection unlike any other PS
2. **Real-time LIVE data** — CPCB has 900+ stations with free APIs. Demo runs on real data, not mock
3. **Visually stunning** — interactive geospatial maps, animated heatmaps, color-coded zones
4. **Multi-agent + multimodal** — 5 specialized AI agents working together
5. **1.67 million deaths/year** — opening number that silences the room

---

## SECTION 4: ARCHITECTURE

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        VAYUDRISHTI PLATFORM                              │
│                                                                          │
│  ┌─────────────────── DATA LAYER ───────────────────────────────────┐   │
│  │                                                                    │   │
│  │  CPCB API ──┐                                                     │   │
│  │  OpenMeteo ──┼── Data Ingestion Service ── MongoDB (Time-Series)  │   │
│  │  Traffic   ──┤      (scheduled jobs)         ↓                    │   │
│  │  Satellite ──┘                          ChromaDB (RAG docs)       │   │
│  │                                                                    │   │
│  └────────────────────────┬──────────────────────────────────────────┘   │
│                           │                                               │
│  ┌─────────────────── INTELLIGENCE LAYER ───────────────────────────┐   │
│  │                        │                                           │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │   │
│  │  │ Prediction   │ │ Source       │ │ Agent Orchestrator       │  │   │
│  │  │ Engine       │ │ Attribution  │ │ (LangChain)              │  │   │
│  │  │              │ │ Engine       │ │                          │  │   │
│  │  │ XGBoost/     │ │              │ │ • Citizen Advisory Agent │  │   │
│  │  │ LSTM model   │ │ ML clustering│ │ • Enforcement Agent      │  │   │
│  │  │ trained on   │ │ + geospatial │ │ • Anomaly Detection      │  │   │
│  │  │ historical   │ │ correlation  │ │ • RAG Query Agent        │  │   │
│  │  │ AQI+weather  │ │              │ │                          │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────────────┘  │   │
│  │                                                                    │   │
│  └────────────────────────┬──────────────────────────────────────────┘   │
│                           │                                               │
│  ┌─────────────────── PRESENTATION LAYER ───────────────────────────┐   │
│  │                        │                                           │   │
│  │  React 19 + Vite                                                   │   │
│  │  ├── Interactive Map (Leaflet.js + OpenStreetMap)                  │   │
│  │  ├── Prediction Dashboard (Recharts)                               │   │
│  │  ├── Source Attribution Panel (Pie/Bar charts)                     │   │
│  │  ├── Citizen Advisory Panel (multi-language cards)                 │   │
│  │  ├── Enforcement Command Center (priority action list)            │   │
│  │  └── City Comparison View                                          │   │
│  │                                                                    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack (Specific Versions)

```
FRONTEND
├── React 19 (via Vite)
├── Tailwind CSS 3
├── Leaflet.js 1.9 + react-leaflet 4 (maps)
├── Leaflet.heat (heatmap plugin)
├── Recharts 2.x (charts and graphs)
├── Axios (HTTP client)
├── Framer Motion (animations)
└── React Router 6 (navigation)

BACKEND
├── Python 3.11+
├── FastAPI 0.100+
├── Uvicorn (ASGI server)
├── Motor (async MongoDB driver)
├── Pydantic 2 (data validation)
├── APScheduler (scheduled data fetching jobs)
├── httpx (async HTTP client for external APIs)
└── python-dotenv (env management)

AI / ML
├── scikit-learn (XGBoost, preprocessing, metrics)
├── xgboost (gradient boosted prediction model)
├── pandas + numpy (data manipulation)
├── Google Generative AI SDK (Gemini 1.5 Flash)
├── LangChain 0.2 (agent orchestration)
├── ChromaDB (vector store for RAG)
├── sentence-transformers (embeddings for RAG)
└── joblib (model serialization)

DATABASE
├── MongoDB 7 (via MongoDB Atlas free tier)
│   ├── aqi_readings collection (time-series)
│   ├── weather_data collection
│   ├── stations collection
│   ├── predictions collection
│   └── enforcement_actions collection
└── ChromaDB (embedded, for regulatory document RAG)

DEPLOYMENT
├── Docker + Docker Compose
├── .env files for API keys
└── GitHub repository
```

---

## SECTION 5: DATA SOURCES (With Actual URLs and Integration Details)

### 1. CPCB Real-Time AQI Data (PRIMARY)
- **Dashboard:** https://app.cpcbccr.com/ccr/#/caaqm-dashboard-all/caaqm-landing
- **How to get data:** CPCB doesn't have an official public REST API. Options:
  - **Option A (Recommended):** Use the OpenWeatherMap Air Pollution API — it aggregates CPCB + other global data
    - Endpoint: `https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={API_KEY}`
    - Historical: `https://api.openweathermap.org/data/2.5/air_pollution/history?lat={lat}&lon={lon}&start={start}&end={end}&appid={API_KEY}`
    - Free tier: 60 calls/minute, 1M calls/month
    - Returns: PM2.5, PM10, NO2, SO2, O3, CO + overall AQI (1-5 scale)
    - **Sign up:** https://openweathermap.org/api (free account)
  - **Option B:** Use AQICN API (World Air Quality Index)
    - Endpoint: `https://api.waqi.info/feed/{city}/?token={API_KEY}`
    - Station search: `https://api.waqi.info/search/?token={API_KEY}&keyword={city}`
    - Map stations: `https://api.waqi.info/map/bounds/?latlng={lat1},{lng1},{lat2},{lng2}&token={API_KEY}`
    - **Sign up:** https://aqicn.org/data-platform/token/ (free)
    - Returns: AQI, individual pollutant readings, station metadata
  - **Option C:** Scrape CPCB dashboard (backup, more fragile)
    - The dashboard loads data via XHR calls that can be reverse-engineered
    - URL pattern: `https://app.cpcbccr.com/ccr_docs/...`

### 2. Weather Data (for prediction model)
- **OpenMeteo API (FREE, no API key needed)**
  - Current weather: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation`
  - Historical: `https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={date}&end_date={date}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation`
  - Forecast: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation&forecast_days=3`
  - **No signup needed.** Completely free
  - Returns: Temperature, humidity, wind speed/direction, precipitation, pressure

### 3. Traffic Density Data
- **TomTom Traffic API (free tier: 2,500 calls/day)**
  - Flow: `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lon}&key={API_KEY}`
  - **Sign up:** https://developer.tomtom.com/
  - Returns: Current speed, free flow speed, confidence, road closure status
- **Alternative:** Use OpenStreetMap road density as a static proxy (no API needed)

### 4. Industrial & Land Use Data
- **OpenStreetMap Overpass API (FREE)**
  - Query industrial zones: `https://overpass-api.de/api/interpreter?data=[out:json];node["landuse"="industrial"](around:10000,{lat},{lon});out;`
  - Query construction sites: `https://overpass-api.de/api/interpreter?data=[out:json];node["landuse"="construction"](around:10000,{lat},{lon});out;`
  - Query hospitals/schools: Same pattern with `"amenity"="hospital"` or `"amenity"="school"`
  - **No signup needed.** Rate limit: be reasonable (cache results)

### 5. Satellite Fire/Burn Detection
- **NASA FIRMS (Fire Information for Resource Management System)**
  - Active fires: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/{country}/{days}`
  - **Sign up:** https://firms.modaps.eosdis.nasa.gov/api/area/ (free NASA Earthdata account)
  - Returns: Latitude, longitude, brightness, confidence, date/time of thermal anomalies
  - **Use case:** Detect crop burning / biomass burning for source attribution

### 6. Gemini AI (for multi-language citizen alerts + RAG)
- **Google AI Studio:** https://aistudio.google.com/
- **Model:** Gemini 1.5 Flash (free tier: 15 RPM, 1M tokens/day)
- **SDK:** `pip install google-generativeai`
- **Use cases:**
  1. Generate health advisories in 6+ Indian languages from AQI data
  2. RAG queries over CPCB regulatory documents
  3. Summarize enforcement evidence packages

### City Coordinates (for API calls)

```python
CITIES = {
    "delhi": {"lat": 28.6139, "lon": 77.2090, "name": "Delhi"},
    "mumbai": {"lat": 19.0760, "lon": 72.8777, "name": "Mumbai"},
    "bengaluru": {"lat": 12.9716, "lon": 77.5946, "name": "Bengaluru"},
    "kolkata": {"lat": 22.5726, "lon": 88.3639, "name": "Kolkata"},
    "chennai": {"lat": 13.0827, "lon": 80.2707, "name": "Chennai"},
    "hyderabad": {"lat": 17.3850, "lon": 78.4867, "name": "Hyderabad"},
    "lucknow": {"lat": 26.8467, "lon": 80.9462, "name": "Lucknow"},
    "jabalpur": {"lat": 23.1815, "lon": 79.9864, "name": "Jabalpur"},
}
```

### AQI Category Mapping (India NAQI Standard)

```python
AQI_CATEGORIES = {
    (0, 50): {"label": "Good", "color": "#00b050", "health": "Minimal impact"},
    (51, 100): {"label": "Satisfactory", "color": "#92d050", "health": "Minor breathing discomfort for sensitive people"},
    (101, 200): {"label": "Moderate", "color": "#ffff00", "health": "Breathing discomfort for asthma/heart patients"},
    (201, 300): {"label": "Poor", "color": "#ff9900", "health": "Breathing discomfort on prolonged exposure"},
    (301, 400): {"label": "Very Poor", "color": "#ff0000", "health": "Respiratory illness on prolonged exposure"},
    (401, 500): {"label": "Severe", "color": "#990000", "health": "Affects healthy people, serious impact on ill"},
}
```

---

## SECTION 6: DATABASE SCHEMA

### MongoDB Collections

```javascript
// Collection: stations
{
  _id: ObjectId,
  station_id: "delhi_anand_vihar",
  name: "Anand Vihar, Delhi",
  city: "delhi",
  latitude: 28.6469,
  longitude: 77.3164,
  type: "CAAQMS",  // or "manual"
  active: true,
  zone: "East Delhi"
}

// Collection: aqi_readings (time-series)
{
  _id: ObjectId,
  station_id: "delhi_anand_vihar",
  city: "delhi",
  timestamp: ISODate("2026-07-08T10:00:00Z"),
  aqi: 287,
  pm25: 142.5,
  pm10: 218.3,
  no2: 45.2,
  so2: 12.8,
  o3: 38.1,
  co: 1.4,
  temperature: 38.2,
  humidity: 45,
  wind_speed: 8.5,
  wind_direction: 220,
  source: "openweathermap"  // or "aqicn", "cpcb"
}

// Collection: predictions
{
  _id: ObjectId,
  station_id: "delhi_anand_vihar",
  city: "delhi",
  generated_at: ISODate("2026-07-08T10:00:00Z"),
  predictions: [
    { timestamp: ISODate("2026-07-08T11:00:00Z"), aqi: 295, confidence_low: 270, confidence_high: 320 },
    { timestamp: ISODate("2026-07-08T12:00:00Z"), aqi: 310, confidence_low: 285, confidence_high: 340 },
    // ... 72 hours of hourly predictions
  ],
  model_version: "xgboost_v1",
  rmse: 24.5
}

// Collection: source_attributions
{
  _id: ObjectId,
  zone: "East Delhi",
  city: "delhi",
  timestamp: ISODate("2026-07-08T10:00:00Z"),
  attributions: {
    vehicular: 0.42,
    industrial: 0.25,
    construction: 0.18,
    biomass_burning: 0.10,
    other: 0.05
  },
  evidence: {
    traffic_congestion_score: 0.85,
    nearby_industries: 12,
    active_construction_sites: 5,
    fire_hotspots_detected: 2
  }
}

// Collection: enforcement_actions
{
  _id: ObjectId,
  city: "delhi",
  generated_at: ISODate("2026-07-08T10:00:00Z"),
  priority: 1,  // 1 = highest
  action_type: "inspect_industrial",
  title: "Deploy inspector to Industrial Area, Anand Vihar",
  description: "SO2 levels 3.2x above threshold for 6 consecutive hours",
  evidence: {
    pollutant: "SO2",
    current_level: 89.5,
    threshold: 28.0,
    duration_hours: 6,
    nearby_sources: ["Anand Vihar Industrial Area"],
    station_id: "delhi_anand_vihar"
  },
  status: "pending"  // pending, assigned, resolved
}

// Collection: citizen_advisories
{
  _id: ObjectId,
  city: "delhi",
  zone: "East Delhi",
  generated_at: ISODate("2026-07-08T10:00:00Z"),
  aqi_level: 310,
  category: "Very Poor",
  advisories: {
    general: {
      en: "Air quality is Very Poor. Avoid outdoor activities. Keep windows closed.",
      hi: "हवा की गुणवत्ता बहुत खराब है। बाहरी गतिविधियों से बचें। खिड़कियाँ बंद रखें।",
      ta: "காற்றின் தரம் மிகவும் மோசம். வெளிப்புற நடவடிக்கைகளைத் தவிர்க்கவும்.",
      kn: "ವಾಯು ಗುಣಮಟ್ಟ ಬಹಳ ಕಳಪೆಯಾಗಿದೆ. ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳನ್ನು ತಪ್ಪಿಸಿ.",
      bn: "বায়ুর মান খুবই খারাপ। বাইরের কার্যকলাপ এড়িয়ে চলুন।",
      te: "గాలి నాణ్యత చాలా అధ్వాన్నంగా ఉంది. బయటి కార్యకలాపాలను నివారించండి."
    },
    vulnerable: "Senior citizens, children under 12, and asthma patients should stay indoors. Use N95 masks if going outside is unavoidable.",
    outdoor_workers: "Construction workers and delivery personnel should take 15-minute breaks every hour in shaded areas."
  }
}
```

---

## SECTION 7: BACKEND API SPECIFICATION

### Base URL: `http://localhost:8000/api/v1`

```
ROUTES
│
├── /stations
│   ├── GET /                          → List all stations (filter by city)
│   ├── GET /{station_id}             → Get station details
│   └── GET /{station_id}/readings    → Get readings (query: hours=24)
│
├── /aqi
│   ├── GET /current?city={city}      → Current AQI for all stations in a city
│   ├── GET /history?station_id={id}&start={date}&end={date}
│   │                                  → Historical AQI readings
│   ├── GET /heatmap?city={city}      → AQI data formatted for map heatmap layer
│   └── GET /compare?cities=delhi,mumbai → Multi-city comparison data
│
├── /predict
│   ├── GET /forecast?station_id={id}&hours=72
│   │                                  → 72-hour AQI prediction with confidence bands
│   ├── GET /alerts?city={city}       → Active alerts (predicted AQI > threshold)
│   └── POST /trigger-forecast        → Manually trigger forecast generation
│
├── /attribution
│   ├── GET /sources?city={city}&zone={zone}
│   │                                  → Source attribution breakdown for a zone
│   ├── GET /evidence?zone={zone}     → Detailed evidence trail for attribution
│   └── GET /industrial?city={city}   → Nearby industrial zones + their impact
│
├── /enforcement
│   ├── GET /actions?city={city}      → Priority-ranked enforcement actions
│   ├── GET /actions/{action_id}      → Single action with full evidence package
│   └── PATCH /actions/{action_id}    → Update action status (pending → assigned)
│
├── /advisory
│   ├── GET /citizen?city={city}&zone={zone}
│   │                                  → Current health advisory in all languages
│   ├── GET /vulnerability-map?city={city}
│   │                                  → Schools, hospitals, outdoor worker zones
│   └── POST /generate               → Trigger Gemini AI to generate new advisory
│
├── /chat (RAG)
│   └── POST /query                   → Ask questions about CPCB regulations
│         Body: { "question": "What is the NAQI threshold for PM2.5?" }
│         Returns: { "answer": "...", "sources": [...] }
│
└── /data
    ├── POST /ingest                   → Trigger data fetch from all APIs
    └── GET /status                    → Data freshness status for all sources
```

### FastAPI Backend Structure

```
backend/
├── main.py                  # FastAPI app, CORS, lifespan events
├── config.py                # Settings, API keys, MongoDB URI
├── requirements.txt
├── .env                     # API keys (gitignored)
│
├── routers/
│   ├── stations.py          # /stations routes
│   ├── aqi.py               # /aqi routes
│   ├── predict.py           # /predict routes
│   ├── attribution.py       # /attribution routes
│   ├── enforcement.py       # /enforcement routes
│   ├── advisory.py          # /advisory routes
│   ├── chat.py              # /chat RAG routes
│   └── data.py              # /data ingestion routes
│
├── services/
│   ├── data_ingestion.py    # Fetch from CPCB/OpenWeatherMap/OpenMeteo/FIRMS
│   ├── prediction.py        # XGBoost model training + inference
│   ├── attribution.py       # Source attribution ML logic
│   ├── enforcement.py       # Enforcement action generation
│   ├── advisory.py          # Gemini AI advisory generation
│   ├── rag.py               # ChromaDB + LangChain RAG pipeline
│   └── scheduler.py         # APScheduler jobs for periodic data fetch
│
├── models/
│   ├── schemas.py           # Pydantic models for request/response
│   └── database.py          # MongoDB connection + collection references
│
├── ml/
│   ├── train_model.py       # Script to train XGBoost on historical data
│   ├── predict.py           # Load model + run inference
│   └── saved_models/        # Serialized .joblib model files
│
├── data/
│   ├── stations.json        # Static list of CPCB station coordinates
│   ├── regulatory_docs/     # CPCB guidelines PDFs for RAG
│   └── sample_data/         # Sample CSVs for demo
│
└── Dockerfile
```

---

## SECTION 8: FRONTEND SPECIFICATION

### React App Structure

```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
│
├── public/
│   └── favicon.ico
│
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Router + layout
│   ├── index.css             # Tailwind imports + global styles
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx         # Top navigation with city selector
│   │   │   ├── Sidebar.jsx        # Left sidebar with view toggles
│   │   │   └── Footer.jsx
│   │   │
│   │   ├── map/
│   │   │   ├── AQIMap.jsx         # Main Leaflet map component
│   │   │   ├── StationMarker.jsx  # Color-coded AQI marker
│   │   │   ├── HeatmapLayer.jsx   # Pollution heatmap overlay
│   │   │   ├── TimeSlider.jsx     # Animate AQI over 24/48 hours
│   │   │   └── VulnerabilityOverlay.jsx  # Schools, hospitals overlay
│   │   │
│   │   ├── charts/
│   │   │   ├── AQITrendChart.jsx       # 24-hour AQI line chart
│   │   │   ├── PredictionChart.jsx     # 72-hour forecast with confidence bands
│   │   │   ├── PollutantBreakdown.jsx  # Bar chart of PM2.5, PM10, NO2, etc.
│   │   │   ├── SourcePieChart.jsx      # Source attribution pie chart
│   │   │   └── CityComparisonChart.jsx # Multi-city AQI comparison
│   │   │
│   │   ├── panels/
│   │   │   ├── StationDetail.jsx       # Popup/sidebar for selected station
│   │   │   ├── PredictionPanel.jsx     # Forecast view with alerts
│   │   │   ├── AttributionPanel.jsx    # Source breakdown + evidence
│   │   │   ├── AdvisoryPanel.jsx       # Multi-language health alerts
│   │   │   ├── EnforcementPanel.jsx    # Priority action list
│   │   │   └── ChatPanel.jsx          # RAG query interface
│   │   │
│   │   └── common/
│   │       ├── AQIBadge.jsx           # Color-coded AQI value badge
│   │       ├── LoadingSpinner.jsx
│   │       ├── AlertCard.jsx          # Warning/danger notification card
│   │       └── LanguageSelector.jsx   # Switch advisory language
│   │
│   ├── pages/
│   │   ├── Dashboard.jsx       # Main view: map + sidebar panels
│   │   ├── Predictions.jsx     # Full prediction view
│   │   ├── Enforcement.jsx     # Enforcement command center
│   │   ├── Advisory.jsx        # Citizen advisory view
│   │   └── Compare.jsx         # Multi-city comparison
│   │
│   ├── hooks/
│   │   ├── useAQIData.js       # Fetch + cache AQI data
│   │   ├── usePredictions.js   # Fetch predictions
│   │   └── useStations.js      # Fetch station list
│   │
│   ├── services/
│   │   └── api.js              # Axios instance + all API calls
│   │
│   └── utils/
│       ├── aqiColors.js        # AQI → color mapping
│       ├── formatters.js       # Date, number formatting
│       └── constants.js        # City coords, AQI categories
```

### UI Design Requirements

**Color Palette:**
- Background: `#0f172a` (dark navy — dark mode)
- Cards: `#1e293b` with subtle border `#334155`
- Primary accent: `#3b82f6` (blue)
- AQI colors: Green → Yellow → Orange → Red → Purple → Maroon (as per NAQI)
- Text: `#f1f5f9` (light) / `#94a3b8` (muted)

**Design Principles:**
- Dark mode throughout (modern, professional, matches dashboard aesthetic)
- Glassmorphism on cards (subtle backdrop-blur, semi-transparent backgrounds)
- Smooth transitions on data updates (framer-motion)
- The map takes 65% of the screen width. Right panel takes 35%
- Responsive but optimized for desktop/laptop (this is a command center, not mobile)

**Key Visual Elements:**
- Station markers PULSE when AQI > 300 (CSS animation)
- Heatmap uses gradient opacity based on AQI intensity
- Prediction chart shows shaded confidence band (light blue fill between upper/lower bound)
- Enforcement actions have severity indicators (red/orange/yellow badges)
- Advisory cards have flag icons for each language

---

## SECTION 9: ML MODEL SPECIFICATION

### Prediction Model (XGBoost)

**Objective:** Predict AQI for the next 72 hours at each station

**Features (input):**
```python
features = [
    # Current + lagged AQI values
    "aqi_t",          # current AQI
    "aqi_t-1",        # 1 hour ago
    "aqi_t-3",        # 3 hours ago
    "aqi_t-6",        # 6 hours ago
    "aqi_t-12",       # 12 hours ago
    "aqi_t-24",       # 24 hours ago (same time yesterday)
    "aqi_t-168",      # 7 days ago (same time last week)
    
    # Weather features
    "temperature",
    "humidity",
    "wind_speed",
    "wind_direction",
    "precipitation",
    
    # Temporal features
    "hour_of_day",    # 0-23
    "day_of_week",    # 0-6
    "month",          # 1-12
    "is_weekend",     # 0/1
    
    # Rolling statistics
    "aqi_rolling_mean_6h",
    "aqi_rolling_std_6h",
    "aqi_rolling_mean_24h",
    "aqi_rolling_max_24h",
]
```

**Target:** `aqi_t+h` (AQI at time t + h hours, where h = 1 to 72)

**Training approach:**
1. Fetch 6+ months of historical AQI + weather data from OpenWeatherMap/OpenMeteo
2. Create sliding window features for each station
3. Train one XGBoost model per forecast horizon (1h, 3h, 6h, 12h, 24h, 48h, 72h) OR train a single multi-output model
4. Evaluate with RMSE and MAE on a held-out test set (last 30 days)
5. Save model with joblib

**Confidence bands:** Use XGBoost quantile regression with alpha=0.1 and alpha=0.9 to get 80% prediction intervals

### Source Attribution Model

**Approach:** Rule-based + ML clustering (simpler but effective for hackathon)

```python
def attribute_sources(station_data, traffic_score, industrial_count, 
                      construction_count, fire_count, wind_data):
    """
    Estimate pollution source contributions using a weighted rule-based system
    calibrated against known source profiles.
    """
    # Source signature profiles (from CPCB emission inventory studies)
    # Vehicular: high NO2, moderate PM2.5, peaks during rush hours (8-10 AM, 5-8 PM)
    # Industrial: high SO2, high NO2, relatively constant
    # Construction: very high PM10, low gases, active during work hours
    # Biomass burning: high PM2.5, high CO, detected by satellite fire data
    
    scores = {
        "vehicular": calculate_vehicular_score(station_data, traffic_score),
        "industrial": calculate_industrial_score(station_data, industrial_count),
        "construction": calculate_construction_score(station_data, construction_count),
        "biomass_burning": calculate_biomass_score(station_data, fire_count),
    }
    
    # Normalize to percentages
    total = sum(scores.values())
    return {k: round(v / total, 2) for k, v in scores.items()}
```

---

## SECTION 10: AGENT SYSTEM (LangChain)

### Agent 1: Citizen Advisory Agent
```python
# Triggered when: predicted AQI > threshold for any zone
# Input: AQI level, zone name, city, vulnerable locations
# Output: Multi-language health advisories
# LLM: Gemini 1.5 Flash

ADVISORY_PROMPT = """
You are an air quality health advisory system for Indian cities.

Current conditions:
- City: {city}
- Zone: {zone}
- AQI: {aqi} ({category})
- Primary pollutants: {pollutants}
- Nearby vulnerable locations: {vulnerable_locations}

Generate health advisories for:
1. General public
2. Vulnerable populations (elderly, children, respiratory patients)
3. Outdoor workers (construction, delivery, traffic police)

Generate each advisory in these languages:
- English
- Hindi (हिंदी)
- Tamil (தமிழ்)
- Kannada (ಕನ್ನಡ)
- Bengali (বাংলা)
- Telugu (తెలుగు)

Keep each advisory under 2 sentences. Be specific and actionable.
Return as JSON with structure: {format_example}
"""
```

### Agent 2: Enforcement Intelligence Agent
```python
# Triggered when: AQI anomaly detected or threshold breached
# Input: Current readings, historical patterns, nearby sources
# Output: Prioritized enforcement actions with evidence

ENFORCEMENT_PROMPT = """
You are an environmental enforcement intelligence system.

Analyze this pollution event and generate an enforcement recommendation:

Station: {station_name}
Current AQI: {current_aqi} (Threshold: {threshold})
Duration above threshold: {duration} hours
Primary pollutant: {primary_pollutant}
Nearby emission sources: {sources}
Wind direction: {wind_direction}° (pollution likely coming from {upwind_direction})
Traffic congestion level: {traffic_level}
Active fire hotspots in area: {fire_count}

Generate:
1. Priority level (1-5, 1=highest)
2. Recommended action (specific, actionable)
3. Evidence summary (cite specific data points)
4. Estimated impact if action is taken

Return as JSON.
"""
```

### Agent 3: RAG Query Agent
```python
# ChromaDB loaded with CPCB regulatory documents
# User can ask questions about regulations, thresholds, compliance

# Documents to ingest into ChromaDB:
# - CPCB National Ambient Air Quality Standards (NAAQS)
# - National Clean Air Programme (NCAP) guidelines
# - CPCB CAAQMS operational protocols
# - AQI calculation methodology
# - State-level emission norms

# Chunk size: 500 tokens, overlap: 50 tokens
# Embedding model: all-MiniLM-L6-v2 (sentence-transformers)
# Top-k retrieval: 5 chunks
```

---

## SECTION 11: ENVIRONMENT SETUP

### .env File
```bash
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/vayudrishti

# APIs
OPENWEATHERMAP_API_KEY=<your_key>
AQICN_API_KEY=<your_key>
TOMTOM_API_KEY=<your_key>
NASA_FIRMS_MAP_KEY=<your_key>
GEMINI_API_KEY=<your_key>

# App
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173
```

### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    depends_on:
      - mongodb
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### Quick Start Commands
```bash
# Clone and setup
git clone https://github.com/<your-username>/vayudrishti.git
cd vayudrishti

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # fill in API keys
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Or use Docker
docker-compose up --build
```

### requirements.txt
```
fastapi==0.115.0
uvicorn==0.30.0
motor==3.5.0
pydantic==2.8.0
httpx==0.27.0
apscheduler==3.10.4
python-dotenv==1.0.1
xgboost==2.0.3
scikit-learn==1.5.1
pandas==2.2.2
numpy==1.26.4
joblib==1.4.2
google-generativeai==0.7.0
langchain==0.2.6
langchain-google-genai==1.0.7
chromadb==0.5.3
sentence-transformers==3.0.1
```

### package.json dependencies (frontend)
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.25.0",
    "axios": "^1.7.2",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "leaflet.heat": "^0.2.0",
    "recharts": "^2.12.7",
    "framer-motion": "^11.3.0",
    "@tailwindcss/forms": "^0.5.7"
  },
  "devDependencies": {
    "vite": "^5.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

---

## SECTION 12: DEMO VIDEO SCRIPT (3-4 Minutes)

```
SCENE 1 — THE HOOK (0:00 - 0:15)
─────────────────────────────────
[Black screen, white text fading in]
"1.67 million Indians die every year from air pollution."
[pause]
"The data to save them exists."
[pause]
"The intelligence to act on it doesn't."
[pause]
"Until now."
[VayuDrishti logo + tagline appears]

SCENE 2 — LIVE MAP (0:15 - 0:50)
─────────────────────────────────
[Show full dashboard — dark mode, map centered on Delhi]
"This is VayuDrishti. Right now, you're looking at live air quality
data from 40 monitoring stations across Delhi."

[Hover over a red station marker — popup appears with AQI 312, PM2.5, PM10]
"Each station shows real-time readings — AQI, PM2.5, PM10, NO2, SO2."

[Toggle heatmap layer ON — red/orange gradient fills the map]
"The heatmap layer interpolates between stations to show pollution
density across the entire city."

[Drag the time slider — show 24-hour timelapse]
"And we can animate how pollution moved across Delhi over the past
24 hours. Watch how it builds up overnight and peaks by morning."

SCENE 3 — PREDICTION (0:50 - 1:20)
───────────────────────────────────
[Click a station, open prediction panel]
"But VayuDrishti doesn't just show the present. It predicts the future."

[Show 72-hour forecast chart with confidence bands]
"Our XGBoost model, trained on historical AQI and weather data,
predicts AQI for the next 72 hours at each station."

[Point to the confidence band]
"The shaded region shows the 80% confidence interval."

[Alert notification pops up — red badge]
"When predicted AQI crosses 300, the system automatically triggers
alerts. Tomorrow at 6 AM, Anand Vihar is predicted to hit AQI 420."

SCENE 4 — SOURCE ATTRIBUTION (1:20 - 1:50)
───────────────────────────────────────────
[Navigate to source attribution panel]
"Knowing the AQI is bad isn't enough. You need to know WHY."

[Show pie chart: Vehicular 42%, Industrial 25%, Construction 18%, 
Biomass 10%, Other 5%]
"VayuDrishti's source attribution engine correlates AQI patterns
with traffic density, industrial zones, construction activity,
and satellite fire detection data to estimate each source's
contribution — zone by zone."

[Show evidence trail — traffic heatmap overlay, industrial markers]
"Every attribution comes with evidence. Not guesses — data."

SCENE 5 — CITIZEN ADVISORY (1:50 - 2:20)
─────────────────────────────────────────
[Navigate to advisory panel]
"When AQI hits dangerous levels, VayuDrishti's AI generates
targeted health advisories."

[Show advisory cards in 6 languages — English, Hindi, Tamil, 
Kannada, Bengali, Telugu]
"Advisories are generated by Gemini AI in 6 Indian languages,
tailored for three groups — general public, vulnerable populations,
and outdoor workers."

[Toggle vulnerability overlay — schools and hospitals appear on map]
"We overlay schools, hospitals, and outdoor worker zones on the
pollution map — showing exactly who is most at risk, and where."

SCENE 6 — ENFORCEMENT (2:20 - 2:50)
────────────────────────────────────
[Navigate to enforcement command center]
"VayuDrishti tells city administrators exactly where to act."

[Show prioritized action list with red/orange/yellow badges]
"Priority-ranked enforcement actions, each backed by an evidence
package — sensor readings, duration, source correlation, wind
direction analysis."

[Click an action — show full evidence]
"Action 1: Deploy inspector to Anand Vihar Industrial Area.
SO2 levels 3.2x above threshold for 6 consecutive hours.
Wind direction confirms pollution source is upwind."

[Switch city selector from Delhi to Mumbai — whole dashboard updates]
"And it works for ANY city. Switch to Mumbai — same platform,
different data, instant intelligence."

SCENE 7 — ARCHITECTURE + CLOSE (2:50 - 3:30)
──────────────────────────────────────────────
[Show architecture diagram]
"Under the hood: a multi-agent AI platform. Five specialized
agents — data ingestion, prediction, source attribution,
citizen advisory, enforcement intelligence — orchestrated
by LangChain, powered by Gemini AI, built on FastAPI and React."

[Show tech stack icons]
"Real-time data from CPCB, OpenWeatherMap, NASA FIRMS, and
TomTom. Predictions by XGBoost. RAG over CPCB regulatory
documents using ChromaDB."

[Show scalability — map zooms out to show all of India]
"900+ monitoring stations. 300+ cities. One platform."

[Final card — dark background, white text]
"VayuDrishti doesn't just measure pollution.
It tells you WHY it's happening,
WHERE it will happen next,
and WHAT to do about it.

Because India doesn't have an air quality data problem.
It has an air quality intelligence problem."

[Logo + GitHub URL + team name]
```

---

## SECTION 13: DELIVERABLES CHECKLIST

### GitHub Repository
- [ ] Clean README with: project description, architecture diagram, setup instructions, screenshots, demo video link, team info
- [ ] Backend code (FastAPI) — clean, documented, working
- [ ] Frontend code (React) — clean, documented, working
- [ ] ML model training script + saved model
- [ ] Docker Compose for one-command setup
- [ ] Sample data for offline demo
- [ ] .env.example (with placeholder keys)
- [ ] LICENSE file (MIT)

### Detailed Document (PDF, 10-15 pages)
- [ ] Cover page: VayuDrishti, team name, hackathon name
- [ ] Problem analysis: statistics, current gaps, why this matters
- [ ] Solution overview: what VayuDrishti does (high level)
- [ ] Architecture diagram (clean, professional)
- [ ] Technical deep-dive: each component explained
- [ ] Innovation highlights: what makes this different from existing dashboards
- [ ] Data sources and integration approach
- [ ] ML model methodology + evaluation metrics
- [ ] Agent system design
- [ ] Scalability analysis: how it works for 300+ cities
- [ ] Business impact: use cases for CPCB, municipal corporations, Smart City Mission
- [ ] Future roadmap: mobile app, real IoT sensor integration, partnership with CPCB
- [ ] Team profiles
- [ ] References

### Demo Video (3-4 minutes, MP4)
- [ ] Screen recording of working prototype
- [ ] Voiceover narration (clear, professional)
- [ ] Follow the script in Section 12 above
- [ ] Record at 1080p, clean audio
- [ ] Tools: OBS Studio (free) for recording, CapCut/DaVinci Resolve (free) for editing

### Presentation Deck (10-12 slides)
- [ ] For Phase 3 finale (if selected) — prepare in advance
- [ ] Same story arc as demo video but for live presentation
- [ ] Include live demo segments between slides

---

## SECTION 14: EXECUTION TIMELINE (Updated)

| Date | Day | Focus |
|---|---|---|
| **Jul 8-9** | Tue-Wed | Set up repo, get ALL APIs working (OpenWeatherMap, AQICN, OpenMeteo, FIRMS). FastAPI skeleton with /stations and /aqi routes. Basic React app with Leaflet map showing real markers |
| **Jul 10-11** | Thu-Fri | Data ingestion service (scheduled fetching). Historical data collection for ML training. Frontend: heatmap overlay, station popups with charts |
| **Jul 12** | Sat | Train XGBoost prediction model. /predict routes. Frontend: prediction chart with confidence bands |
| **Jul 13-14** | Sun-Mon | Source attribution engine (traffic + industrial + fire correlation). /attribution routes. Frontend: pie charts, evidence panel |
| **Jul 15-16** | Tue-Wed | Gemini AI integration: citizen advisory agent + enforcement agent. /advisory and /enforcement routes. Frontend: advisory cards, enforcement list |
| **Jul 17-18** | Thu-Fri | RAG pipeline (ChromaDB + regulatory docs). Multi-city support. Integration testing. Polish UI — animations, loading states, error handling |
| **Jul 19** | Sat | **Quiz 1 prep + buffer day.** Fix bugs, improve UI polish |
| **Jul 20** | Sun | Full day hackathon sprint: Docker setup, README, screenshots, architecture diagram |
| **Jul 21** | Mon | Record demo video. Write detailed document. Final testing |
| **Jul 22** | Tue | Submit on Unstop before 11:59 PM IST |

---

## SECTION 15: KEY DIFFERENTIATORS (Why This Beats Other Teams)

Most teams will build one of these:
1. A simple AQI dashboard showing current readings (boring, no intelligence)
2. A chatbot that answers air quality questions (looks like ChatGPT wrapper)
3. A prediction model without any actionable output (academic, not practical)

**VayuDrishti is none of these. It is:**
1. ✅ A multi-agent INTELLIGENCE PLATFORM, not a dashboard
2. ✅ Runs on LIVE data, not mock/sample data
3. ✅ PREDICTS (72-hour forecasts), not just displays
4. ✅ EXPLAINS (source attribution with evidence), not just shows numbers
5. ✅ ACTS (enforcement recommendations, citizen alerts), not just informs
6. ✅ Multi-language (6 Indian languages), not just English
7. ✅ Multi-city (Delhi, Mumbai, Bengaluru with one click), not just one city
8. ✅ Geospatially rich (animated heatmaps, vulnerability overlays), not static charts
9. ✅ Agentic AI architecture (LangChain orchestration), not single LLM calls
10. ✅ RAG over regulatory corpus (CPCB guidelines), not hallucinated compliance info
