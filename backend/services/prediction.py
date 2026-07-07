import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any
from backend.config import settings
from backend.models.database import db_helper

# Model Paths
ML_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml")
MODEL_PATH = os.path.join(ML_DIR, "saved_models", "xgboost_aqi_model.joblib")
METADATA_PATH = os.path.join(ML_DIR, "saved_models", "model_metadata.joblib")

class PredictionService:
    def __init__(self):
        self.model = None
        self.metadata = None
        self.rmse = 24.5  # default baseline RMSE
        self.model_loaded = False
        self._load_model()
        
    def _load_model(self):
        try:
            if os.path.exists(MODEL_PATH) and os.path.exists(METADATA_PATH):
                self.model = joblib.load(MODEL_PATH)
                self.metadata = joblib.load(METADATA_PATH)
                self.rmse = self.metadata.get("rmse", 24.5)
                self.model_loaded = True
                print(f"XGBoost model loaded successfully from {MODEL_PATH}.")
            else:
                print("XGBoost model file not found. Attempting to train on startup...")
                from backend.ml.train_model import train_and_save_model
                self.rmse = train_and_save_model()
                self.model = joblib.load(MODEL_PATH)
                self.metadata = joblib.load(METADATA_PATH)
                self.model_loaded = True
                print("XGBoost model trained and loaded successfully.")
        except Exception as e:
            print(f"Warning: Failed to load/train XGBoost model: {e}. Using statistical fallback forecaster.")
            self.model_loaded = False

    def generate_statistical_forecast(self, station: Dict[str, Any], last_readings: List[Dict[str, Any]], hours: int = 72) -> List[Dict[str, Any]]:
        """
        Fallback forecaster combining persistence, station diurnal pattern, and weather conditions.
        Ensures the UI always gets realistic predictions.
        """
        station_id = station["station_id"]
        city = station["city"]
        
        # 1. Get starting points
        if last_readings:
            start_aqi = last_readings[-1]["aqi"]
            start_temp = last_readings[-1].get("temperature") or 25.0
            start_humidity = last_readings[-1].get("humidity") or 60.0
            start_wind = last_readings[-1].get("wind_speed") or 8.0
        else:
            # Seed default starting values
            start_aqi = 320 if city == "delhi" else 150
            start_temp = 32.0
            start_humidity = 55.0
            start_wind = 7.0
            
        forecast_items = []
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        
        # We model a diurnal variation factor based on hour of day
        # Peak: 7-9 AM (+25 AQI), 7-10 PM (+35 AQI)
        # Trough: 1-4 PM (-30 AQI)
        def diurnal_effect(h: int) -> float:
            if 7 <= h <= 9:
                return 20.0
            elif 19 <= h <= 22:
                return 35.0
            elif 13 <= h <= 16:
                return -25.0
            return 0.0

        current_aqi = start_aqi
        for step in range(1, hours + 1):
            target_time = now + timedelta(hours=step)
            h = target_time.hour
            
            # Predict next step recursively
            # Slowly decay back towards the city baseline over 72 hours (persistence with mean reversion)
            baseline = 240 if city == "delhi" else (140 if city in ["mumbai", "kolkata"] else 80)
            
            # Autoregressive component + mean reversion + diurnal fluctuation + random walk noise
            persistence_weight = 0.93 - (step * 0.003)  # confidence decreases over time
            noise = np.random.normal(0, 5)
            
            predicted_aqi = (current_aqi * persistence_weight) + (baseline * (1.0 - persistence_weight))
            predicted_aqi += diurnal_effect(h) + noise
            
            # Bounds
            predicted_aqi = float(np.clip(predicted_aqi, 10, 500))
            current_aqi = predicted_aqi  # feed back
            
            # Uncertainty spreads over time: error compounding
            step_rmse = self.rmse * np.sqrt(step) * 0.4
            conf_low = float(np.clip(predicted_aqi - 1.28 * step_rmse, 0, predicted_aqi * 0.98))
            conf_high = float(np.clip(predicted_aqi + 1.28 * step_rmse, predicted_aqi * 1.02, 500))
            
            # Smooth out confidence ranges
            if conf_low >= predicted_aqi:
                conf_low = predicted_aqi - 5
            if conf_high <= predicted_aqi:
                conf_high = predicted_aqi + 5
                
            forecast_items.append({
                "timestamp": target_time,
                "aqi": round(predicted_aqi, 0),
                "confidence_low": round(conf_low, 0),
                "confidence_high": round(conf_high, 0)
            })
            
        return forecast_items

    async def get_forecast_for_station(self, station_id: str, hours: int = 72) -> Dict[str, Any]:
        """
        Retrieve 72-hour AQI prediction with confidence bands for a station.
        """
        # Fetch station metadata
        station = await db_helper.stations.find_one({"station_id": station_id})
        if not station:
            raise ValueError(f"Station {station_id} not found.")
            
        city = station["city"]
        
        # Fetch last 24 readings to build lagged features
        cursor = db_helper.aqi_readings.find({"station_id": station_id}).sort("timestamp", -1).limit(24)
        last_readings = await cursor.to_list(length=24)
        last_readings.reverse()  # chronological order
        
        # Check if we should use fallback
        if not self.model_loaded or len(last_readings) < 12:
            # Statistical fallback: either ML model failed or we don't have enough history
            predictions = self.generate_statistical_forecast(station, last_readings, hours)
        else:
            try:
                # ML inference path
                predictions = []
                now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
                
                # Fetch recent features to feed the model
                history_aqis = [r["aqi"] for r in last_readings]
                
                # Recursive forecast loop
                current_aqi_series = history_aqis.copy()
                latest_reading = last_readings[-1]
                
                temp = latest_reading.get("temperature") or 25.0
                hum = latest_reading.get("humidity") or 60.0
                wind_s = latest_reading.get("wind_speed") or 8.0
                wind_d = latest_reading.get("wind_direction") or 180
                precip = latest_reading.get("precipitation") or 0.0
                
                for step in range(1, hours + 1):
                    target_time = now + timedelta(hours=step)
                    
                    # Create lag features
                    aqi_t = current_aqi_series[-1]
                    aqi_lag1 = current_aqi_series[-2] if len(current_aqi_series) >= 2 else aqi_t
                    aqi_lag3 = current_aqi_series[-4] if len(current_aqi_series) >= 4 else aqi_lag1
                    aqi_lag6 = current_aqi_series[-7] if len(current_aqi_series) >= 7 else aqi_lag3
                    aqi_lag12 = current_aqi_series[-13] if len(current_aqi_series) >= 13 else aqi_lag6
                    # Use lag 24 if available, else copy t-12
                    aqi_lag24 = current_aqi_series[-25] if len(current_aqi_series) >= 25 else aqi_lag12
                    
                    # Rolling stats
                    rolling_6h = np.mean(current_aqi_series[-6:])
                    rolling_std_6h = np.std(current_aqi_series[-6:]) or 10.0
                    rolling_24h = np.mean(current_aqi_series[-24:]) if len(current_aqi_series) >= 24 else np.mean(current_aqi_series)
                    rolling_max_24h = np.max(current_aqi_series[-24:]) if len(current_aqi_series) >= 24 else np.max(current_aqi_series)
                    
                    # Simulated future weather (slightly fluctuates diurnal temp/humidity)
                    future_temp = temp + np.sin(target_time.hour / 24.0 * 2.0 * np.pi) * 5.0 + np.random.normal(0, 0.5)
                    future_hum = max(10.0, min(100.0, hum - np.sin(target_time.hour / 24.0 * 2.0 * np.pi) * 10.0))
                    
                    features_dict = {
                        "aqi_t": aqi_t,
                        "aqi_t-1": aqi_lag1,
                        "aqi_t-3": aqi_lag3,
                        "aqi_t-6": aqi_lag6,
                        "aqi_t-12": aqi_lag12,
                        "aqi_t-24": aqi_lag24,
                        "temperature": future_temp,
                        "humidity": future_hum,
                        "wind_speed": wind_s,
                        "wind_direction": wind_d,
                        "precipitation": precip,
                        "hour_of_day": target_time.hour,
                        "day_of_week": target_time.weekday(),
                        "month": target_time.month,
                        "is_weekend": 1 if target_time.weekday() >= 5 else 0,
                        "aqi_rolling_mean_6h": rolling_6h,
                        "aqi_rolling_std_6h": rolling_std_6h,
                        "aqi_rolling_mean_24h": rolling_24h,
                        "aqi_rolling_max_24h": rolling_max_24h
                    }
                    
                    # XGBoost prediction
                    features_df = pd.DataFrame([features_dict])
                    pred_aqi = float(self.model.predict(features_df)[0])
                    pred_aqi = np.clip(pred_aqi, 10, 500)
                    
                    # Feed back predicted value into series
                    current_aqi_series.append(pred_aqi)
                    
                    # Compounding uncertainty interval
                    step_rmse = self.rmse * np.sqrt(step) * 0.4
                    conf_low = float(np.clip(pred_aqi - 1.28 * step_rmse, 0, pred_aqi * 0.98))
                    conf_high = float(np.clip(pred_aqi + 1.28 * step_rmse, pred_aqi * 1.02, 500))
                    
                    predictions.append({
                        "timestamp": target_time,
                        "aqi": round(pred_aqi, 0),
                        "confidence_low": round(conf_low, 0),
                        "confidence_high": round(conf_high, 0)
                    })
            except Exception as e:
                print(f"Error during ML inference loop: {e}. Falling back to statistical forecast.")
                predictions = self.generate_statistical_forecast(station, last_readings, hours)
                
        # Save prediction summary document to DB for audit/caching
        payload = {
            "station_id": station_id,
            "city": city,
            "generated_at": datetime.utcnow(),
            "predictions": predictions,
            "model_version": "xgboost_v1" if self.model_loaded else "statistical_fallback",
            "rmse": self.rmse
        }
        
        await db_helper.predictions.insert_one(payload)
        
        return payload

    async def get_alerts_for_city(self, city: str, threshold: float = 300.0) -> List[Dict[str, Any]]:
        """
        Find any stations in a city that are predicted to breach the AQI threshold (e.g. 300 - 'Very Poor').
        """
        cursor = db_helper.stations.find({"city": city, "active": True})
        stations = await cursor.to_list(length=100)
        
        alerts = []
        for station in stations:
            station_id = station["station_id"]
            # Get latest prediction
            pred_doc = await db_helper.predictions.find_one(
                {"station_id": station_id},
                sort=[("generated_at", -1)]
            )
            
            if not pred_doc:
                # Generate on the fly
                pred_doc = await self.get_forecast_for_station(station_id, hours=24)
                
            # Scan predictions for threshold breach
            for item in pred_doc["predictions"]:
                if item["aqi"] >= threshold:
                    alerts.append({
                        "station_id": station_id,
                        "station_name": station["name"],
                        "predicted_at": item["timestamp"],
                        "predicted_aqi": item["aqi"],
                        "confidence_high": item["confidence_high"],
                        "zone": station["zone"]
                    })
                    break  # only need one breach report per station
                    
        return sorted(alerts, key=lambda x: x["predicted_aqi"], reverse=True)

prediction_service = PredictionService()
