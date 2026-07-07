from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Dict, Optional

# --- STATIONS ---
class StationBase(BaseModel):
    station_id: str
    name: str
    city: str
    latitude: float
    longitude: float
    type: str = "CAAQMS"
    active: bool = True
    zone: str

class StationCreate(StationBase):
    pass

class StationResponse(StationBase):
    pass


# --- AQI READINGS ---
class AQIReadingBase(BaseModel):
    station_id: str
    city: str
    timestamp: datetime
    aqi: float
    pm25: float
    pm10: float
    no2: float
    so2: float
    o3: float
    co: float
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    source: str = "openweathermap"

class AQIReadingCreate(AQIReadingBase):
    pass

class AQIReadingResponse(AQIReadingBase):
    pass


# --- PREDICTIONS ---
class PredictionItem(BaseModel):
    timestamp: datetime
    aqi: float
    confidence_low: float
    confidence_high: float

class PredictionBase(BaseModel):
    station_id: str
    city: str
    generated_at: datetime
    predictions: List[PredictionItem]
    model_version: str = "xgboost_v1"
    rmse: float = 24.5

class PredictionCreate(PredictionBase):
    pass

class PredictionResponse(PredictionBase):
    pass


# --- SOURCE ATTRIBUTIONS ---
class AttributionBreakdown(BaseModel):
    vehicular: float
    industrial: float
    construction: float
    biomass_burning: float
    other: float

class AttributionEvidence(BaseModel):
    traffic_congestion_score: float
    nearby_industries: int
    active_construction_sites: int
    fire_hotspots_detected: int

class SourceAttributionBase(BaseModel):
    zone: str
    city: str
    timestamp: datetime
    attributions: AttributionBreakdown
    evidence: AttributionEvidence

class SourceAttributionCreate(SourceAttributionBase):
    pass

class SourceAttributionResponse(SourceAttributionBase):
    pass


# --- ENFORCEMENT ACTIONS ---
class EnforcementEvidence(BaseModel):
    pollutant: str
    current_level: float
    threshold: float
    duration_hours: int
    nearby_sources: List[str]
    station_id: str

class EnforcementActionBase(BaseModel):
    city: str
    generated_at: datetime
    priority: int = Field(..., ge=1, le=5)
    action_type: str
    title: str
    description: str
    evidence: EnforcementEvidence
    status: str = "pending"  # pending, assigned, resolved

class EnforcementActionCreate(EnforcementActionBase):
    pass

class EnforcementActionUpdate(BaseModel):
    status: str

class EnforcementActionResponse(EnforcementActionBase):
    id: Optional[str] = Field(None, alias="_id")


# --- CITIZEN ADVISORIES ---
class LanguageAdvisory(BaseModel):
    en: str
    hi: str
    ta: str
    kn: str
    bn: str
    te: str

class CitizenAdvisoryBase(BaseModel):
    city: str
    zone: str
    generated_at: datetime
    aqi_level: float
    category: str
    advisories: Dict[str, Dict[str, str]]
    # e.g., advisories: {
    #   "general": {"en": "...", "hi": "..."},
    #   "vulnerable": {"en": "...", "hi": "..."},
    #   "outdoor_workers": {"en": "...", "hi": "..."}
    # }

class CitizenAdvisoryCreate(CitizenAdvisoryBase):
    pass

class CitizenAdvisoryResponse(CitizenAdvisoryBase):
    pass
