import os
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from backend.config import settings
from backend.models.database import db_helper

# Human-readable labels for the model features (SHAP explanation display)
FEATURE_LABELS = {
    "aqi_t": "Current AQI", "aqi_t-1": "AQI 1h ago", "aqi_t-3": "AQI 3h ago",
    "aqi_t-6": "AQI 6h ago", "aqi_t-12": "AQI 12h ago", "aqi_t-24": "AQI 24h ago",
    "aqi_t-168": "AQI 7d ago (same hour)",
    "temperature": "Temperature", "humidity": "Humidity", "wind_speed": "Wind speed",
    "wind_direction": "Wind direction", "precipitation": "Precipitation",
    "hour_of_day": "Hour of day", "day_of_week": "Day of week", "month": "Month",
    "is_weekend": "Weekend", "aqi_rolling_mean_6h": "6h avg AQI",
    "aqi_rolling_std_6h": "6h AQI volatility", "aqi_rolling_mean_24h": "24h avg AQI",
    "aqi_rolling_max_24h": "24h peak AQI",
}

# Model Paths
ML_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml")
MODEL_PATH = os.path.join(ML_DIR, "saved_models", "xgboost_aqi_model.joblib")
MULTI_MODEL_PATH = os.path.join(ML_DIR, "saved_models", "xgboost_aqi_models_multi.joblib")
METADATA_PATH = os.path.join(ML_DIR, "saved_models", "model_metadata.joblib")

# Feature order the models were trained on (must match ml/train_model.FEATURE_COLUMNS)
FEATURE_COLUMNS = [
    "aqi_t", "aqi_t-1", "aqi_t-3", "aqi_t-6", "aqi_t-12", "aqi_t-24", "aqi_t-168",
    "temperature", "humidity", "wind_speed", "wind_direction", "precipitation",
    "hour_of_day", "day_of_week", "month", "is_weekend",
    "aqi_rolling_mean_6h", "aqi_rolling_std_6h", "aqi_rolling_mean_24h", "aqi_rolling_max_24h",
]

class PredictionService:
    def __init__(self):
        self.model = None
        self.multi_models = None  # {horizon:int -> model}
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
                # Direct multi-horizon bundle (preferred): one model per horizon,
                # each predicting that horizon DIRECTLY. This replaced a broken
                # recursive scheme (24h model fed its own outputs hourly) that lost
                # to persistence at every horizon.
                if os.path.exists(MULTI_MODEL_PATH):
                    self.multi_models = joblib.load(MULTI_MODEL_PATH)
                    print(f"Loaded direct multi-horizon models: {sorted(self.multi_models)}.")
                self.model_loaded = True
                print(f"XGBoost model loaded successfully from {MODEL_PATH}.")
            else:
                # Training is an offline step (`python -m backend.ml.train_model`),
                # not run here. The statistical fallback covers a missing model.
                print("XGBoost model file not found. Run `python -m backend.ml.train_model` "
                      "to train one. Using statistical fallback forecaster for now.")
                self.model_loaded = False
        except Exception as e:
            print(f"Warning: Failed to load XGBoost model: {e}. Using statistical fallback forecaster.")
            self.model_loaded = False

    def _build_feature_row(self, series: List[float], base: Dict[str, Any], target_time: datetime) -> Dict[str, Any]:
        """Assemble one feature row from a trailing AQI series + weather context."""
        aqi_t = series[-1]
        def lag(n, default):
            return series[-n] if len(series) >= n else default
        aqi_l1 = lag(2, aqi_t)
        aqi_l3 = lag(4, aqi_l1)
        aqi_l6 = lag(7, aqi_l3)
        aqi_l12 = lag(13, aqi_l6)
        aqi_l24 = lag(25, aqi_l12)
        aqi_l168 = lag(169, aqi_l24)  # 7-day same-hour lag; falls back to aqi_l24 if history is short
        return {
            "aqi_t": aqi_t, "aqi_t-1": aqi_l1, "aqi_t-3": aqi_l3, "aqi_t-6": aqi_l6,
            "aqi_t-12": aqi_l12, "aqi_t-24": aqi_l24, "aqi_t-168": aqi_l168,
            "temperature": base.get("temperature") or 25.0,
            "humidity": base.get("humidity") or 60.0,
            "wind_speed": base.get("wind_speed") or 8.0,
            "wind_direction": base.get("wind_direction") or 180,
            "precipitation": base.get("precipitation") or 0.0,
            "hour_of_day": target_time.hour, "day_of_week": target_time.weekday(),
            "month": target_time.month, "is_weekend": 1 if target_time.weekday() >= 5 else 0,
            "aqi_rolling_mean_6h": float(np.mean(series[-6:])),
            "aqi_rolling_std_6h": float(np.std(series[-6:]) or 10.0),
            "aqi_rolling_mean_24h": float(np.mean(series[-24:])) if len(series) >= 24 else float(np.mean(series)),
            "aqi_rolling_max_24h": float(np.max(series[-24:])) if len(series) >= 24 else float(np.max(series)),
        }

    def _direct_multihorizon_curve(self, history: List[float], base: Dict[str, Any], now: datetime, hours: int) -> List[float]:
        """Predict AQI directly at each trained anchor horizon, then interpolate
        the hourly curve between anchors (and from 'now' to the first anchor).
        Accurate at the anchors, smooth in between — unlike error-compounding
        recursion."""
        anchors = sorted(h for h in self.multi_models if h <= hours) or [min(self.multi_models)]
        feat_now = base.get("aqi") if base.get("aqi") is not None else history[-1]
        # Direct predictions at each anchor from the SAME current feature row
        anchor_preds = {0: float(feat_now)}
        for h in anchors:
            row = self._build_feature_row(history, base, now + timedelta(hours=h))
            X = pd.DataFrame([row])[FEATURE_COLUMNS]
            anchor_preds[h] = float(np.clip(self.multi_models[h].predict(X)[0], 10, 500))
        # Extend the last anchor flat if the requested horizon exceeds it
        max_anchor = max(anchors)
        knots = sorted(anchor_preds.keys())
        curve = []
        for step in range(1, hours + 1):
            if step >= max_anchor:
                curve.append(anchor_preds[max_anchor])
                continue
            # Linear interpolation between the surrounding anchors
            lo = max(k for k in knots if k <= step)
            hi = min(k for k in knots if k >= step)
            if lo == hi:
                curve.append(anchor_preds[lo])
            else:
                frac = (step - lo) / (hi - lo)
                curve.append(anchor_preds[lo] + (anchor_preds[hi] - anchor_preds[lo]) * frac)
        return curve

    def generate_statistical_forecast(self, station: Dict[str, Any], last_readings: List[Dict[str, Any]], hours: int = 72, now: Optional[datetime] = None) -> List[Dict[str, Any]]:
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
        now = (now or datetime.utcnow()).replace(minute=0, second=0, microsecond=0)
        
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

    async def get_forecast_for_station(self, station_id: str, hours: int = 72, at: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Retrieve 72-hour AQI prediction with confidence bands for a station.

        `at`: forecast as of a historical timestamp (replay mode) — features are
        built only from readings at or before `at`, and the result is not
        persisted (so replay runs never pollute the live prediction cache).
        """
        # Fetch station metadata
        station = await db_helper.stations.find_one({"station_id": station_id})
        if not station:
            raise ValueError(f"Station {station_id} not found.")

        city = station["city"]
        as_of = (at or datetime.utcnow()).replace(minute=0, second=0, microsecond=0)

        # Fetch last 24 readings (at or before `as_of`) to build lagged features
        readings_query: Dict[str, Any] = {"station_id": station_id}
        if at is not None:
            readings_query["timestamp"] = {"$lte": as_of}
        cursor = db_helper.aqi_readings.find(readings_query).sort("timestamp", -1).limit(24)
        last_readings = await cursor.to_list(length=24)
        last_readings.reverse()  # chronological order

        # Check if we should use fallback
        if not self.model_loaded or not self.multi_models or len(last_readings) < 12:
            # Statistical fallback: no direct-horizon models, or too little history
            predictions = self.generate_statistical_forecast(station, last_readings, hours, now=as_of)
        else:
            try:
                # DIRECT multi-horizon inference: predict each anchor horizon
                # directly, then interpolate the hourly curve (no error-compounding
                # recursion).
                now = as_of
                history_aqis = [r["aqi"] for r in last_readings]
                base = dict(last_readings[-1])
                base["aqi"] = history_aqis[-1]
                curve = self._direct_multihorizon_curve(history_aqis, base, now, hours)

                predictions = []
                for step in range(1, hours + 1):
                    target_time = now + timedelta(hours=step)
                    pred_aqi = float(np.clip(curve[step - 1], 10, 500))
                    # Uncertainty widens with horizon but is bounded (direct models
                    # don't compound error), scaled by the per-horizon RMSE.
                    step_rmse = self.rmse * (1.0 + step / 72.0)
                    conf_low = float(np.clip(pred_aqi - 1.28 * step_rmse, 0, pred_aqi * 0.98))
                    conf_high = float(np.clip(pred_aqi + 1.28 * step_rmse, pred_aqi * 1.02, 500))
                    predictions.append({
                        "timestamp": target_time,
                        "aqi": round(pred_aqi, 0),
                        "confidence_low": round(conf_low, 0),
                        "confidence_high": round(conf_high, 0),
                    })
            except Exception as e:
                print(f"Error during ML inference: {e}. Falling back to statistical forecast.")
                predictions = self.generate_statistical_forecast(station, last_readings, hours, now=as_of)

        # Save prediction summary document to DB for audit/caching
        used_ml = self.model_loaded and self.multi_models and len(last_readings) >= 12
        payload = {
            "station_id": station_id,
            "city": city,
            "generated_at": datetime.utcnow(),
            "as_of": as_of,
            "predictions": predictions,
            "model_version": (self.metadata.get("model_version", "xgboost") if used_ml else "statistical_fallback"),
            "rmse": self.rmse,
            "horizon_metrics": (self.metadata or {}).get("horizon_metrics") if used_ml else None,
            "provenance": "replay" if at is not None else "live",
        }

        # Replay forecasts are ephemeral — persisting them would pollute the live
        # prediction cache that get_alerts_for_city() reads.
        if at is None:
            # Note: motor's insert_one() mutates `payload` in place, adding a raw
            # (non-JSON-serializable) ObjectId as "_id" - strip it before returning.
            # The in-memory mock DB deep-copies, so this only bites with real MongoDB.
            await db_helper.predictions.insert_one(payload)
            payload.pop("_id", None)

        return payload

    async def explain_forecast(self, station_id: str, horizon: int = 24, at: Optional[datetime] = None) -> Dict[str, Any]:
        """Exact TreeSHAP attribution for a single-horizon forecast, via XGBoost's
        native `pred_contribs=True` (no external shap dependency). Returns the
        top feature contributions as a waterfall: base value + signed pushes."""
        if not self.model_loaded or not self.multi_models:
            return {"available": False, "reason": "no ML model loaded"}
        # Nearest trained anchor at/above the requested horizon
        anchor = min((h for h in self.multi_models if h >= horizon), default=max(self.multi_models))
        model = self.multi_models[anchor]

        station = await db_helper.stations.find_one({"station_id": station_id})
        if not station:
            raise ValueError(f"Station {station_id} not found.")
        as_of = (at or datetime.utcnow()).replace(minute=0, second=0, microsecond=0)
        query: Dict[str, Any] = {"station_id": station_id}
        if at is not None:
            query["timestamp"] = {"$lte": as_of}
        cursor = db_helper.aqi_readings.find(query).sort("timestamp", -1).limit(24)
        last = await cursor.to_list(length=24)
        last.reverse()
        if len(last) < 12:
            return {"available": False, "reason": "insufficient history"}

        series = [r["aqi"] for r in last]
        base = dict(last[-1]); base["aqi"] = series[-1]
        row = self._build_feature_row(series, base, as_of + timedelta(hours=anchor))
        X = pd.DataFrame([row])[FEATURE_COLUMNS]

        # Exact TreeSHAP contributions: last column is the base (expected) value.
        booster = model.get_booster()
        contribs = booster.predict(xgb.DMatrix(X, feature_names=FEATURE_COLUMNS), pred_contribs=True)[0]
        base_value = float(contribs[-1])
        feat_contribs = contribs[:-1]
        prediction = float(base_value + feat_contribs.sum())

        items = [
            {"feature": FEATURE_COLUMNS[i], "label": FEATURE_LABELS.get(FEATURE_COLUMNS[i], FEATURE_COLUMNS[i]),
             "value": round(float(X.iloc[0, i]), 1), "contribution": round(float(feat_contribs[i]), 1)}
            for i in range(len(FEATURE_COLUMNS))
        ]
        items.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        top = items[:6]
        other = round(sum(x["contribution"] for x in items[6:]), 1)

        return {
            "available": True,
            "station_id": station_id,
            "horizon_hours": anchor,
            "provenance": "replay" if at is not None else "live",
            "base_value": round(base_value, 1),
            "predicted_aqi": round(prediction, 0),
            "top_factors": top,
            "other_factors_sum": other,
            "method": "Exact TreeSHAP via XGBoost pred_contribs (no external shap dependency)",
        }

    async def get_alerts_for_city(self, city: str, threshold: float = 300.0, at: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Find any stations in a city that are predicted to breach the AQI threshold (e.g. 300 - 'Very Poor').
        """
        cursor = db_helper.stations.find({"city": city, "active": True})
        stations = await cursor.to_list(length=100)

        alerts = []
        for station in stations:
            station_id = station["station_id"]
            if at is not None:
                # Replay mode: always compute fresh as-of the historical timestamp
                pred_doc = await self.get_forecast_for_station(station_id, hours=48, at=at)
            else:
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
