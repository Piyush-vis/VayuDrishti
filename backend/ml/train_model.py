import os
import json
import asyncio
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from xgboost import XGBRegressor
from sklearn.metrics import root_mean_squared_error

os.makedirs(os.path.join(os.path.dirname(__file__), "saved_models"), exist_ok=True)

FEATURE_COLUMNS = [
    "aqi_t", "aqi_t-1", "aqi_t-3", "aqi_t-6", "aqi_t-12", "aqi_t-24",
    "temperature", "humidity", "wind_speed", "wind_direction", "precipitation",
    "hour_of_day", "day_of_week", "month", "is_weekend",
    "aqi_rolling_mean_6h", "aqi_rolling_std_6h", "aqi_rolling_mean_24h", "aqi_rolling_max_24h",
]

# The model is trained to predict AQI this many hours ahead. Longer horizons at
# inference time (up to 72h) are covered by feeding predictions back recursively
# (see services/prediction.py), the same way the statistical fallback forecaster works.
FORECAST_HORIZON_HOURS = 24


def _engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build lag/rolling/temporal features and the training target from a chronologically
    ordered per-station AQI+weather time series.

    Every feature here comes from the ACTUAL sequential values in the series (real
    autocorrelation via pandas shift/rolling), and the target is the real AQI
    FORECAST_HORIZON_HOURS ahead of each row - not independent random draws fed through
    an invented linear formula, which is what this replaced.
    """
    required = {"station_id", "timestamp", "aqi", "temperature", "humidity", "wind_speed", "wind_direction"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Training data missing required columns: {missing}")

    if "precipitation" not in df.columns:
        df["precipitation"] = 0.0
    df["precipitation"] = df["precipitation"].fillna(0.0)
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    engineered_groups = []
    for _, g in df.groupby("station_id"):
        g = g.sort_values("timestamp").reset_index(drop=True)
        g["aqi_t"] = g["aqi"]
        g["aqi_t-1"] = g["aqi"].shift(1)
        g["aqi_t-3"] = g["aqi"].shift(3)
        g["aqi_t-6"] = g["aqi"].shift(6)
        g["aqi_t-12"] = g["aqi"].shift(12)
        g["aqi_t-24"] = g["aqi"].shift(24)
        g["aqi_rolling_mean_6h"] = g["aqi"].rolling(6, min_periods=1).mean()
        g["aqi_rolling_std_6h"] = g["aqi"].rolling(6, min_periods=1).std().fillna(0.0)
        g["aqi_rolling_mean_24h"] = g["aqi"].rolling(24, min_periods=1).mean()
        g["aqi_rolling_max_24h"] = g["aqi"].rolling(24, min_periods=1).max()
        g["hour_of_day"] = g["timestamp"].dt.hour
        g["day_of_week"] = g["timestamp"].dt.dayofweek
        g["month"] = g["timestamp"].dt.month
        g["is_weekend"] = (g["day_of_week"] >= 5).astype(int)
        # Real supervised target: the actual AQI recorded FORECAST_HORIZON_HOURS later.
        g["target"] = g["aqi"].shift(-FORECAST_HORIZON_HOURS)
        # Naive persistence baseline: "AQI in H hours = AQI right now" - this is the
        # exact baseline the problem statement's evaluation focus asks to beat.
        g["persistence_pred"] = g["aqi_t"]
        engineered_groups.append(g)

    result = pd.concat(engineered_groups, ignore_index=True)
    result = result.dropna(subset=["aqi_t-24", "target"]).reset_index(drop=True)
    return result


async def _load_real_readings_from_db(min_rows: int = 3000):
    """
    Pull whatever real (or previously-seeded) AQI history has accumulated in the
    database. Returns None if there isn't enough yet, so the caller can bootstrap
    instead of training on a too-thin sample.
    """
    from backend.models.database import db_helper

    if db_helper.stations is None:
        db_helper.connect()

    try:
        await db_helper.client.admin.command('ping')
    except Exception:
        db_helper.use_mock_collections()
        # A fresh mock DB has no accumulated history worth training on.
        return None

    cursor = db_helper.aqi_readings.find({})
    rows = await cursor.to_list(length=500000)
    if len(rows) < min_rows:
        return None

    df = pd.DataFrame(rows)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df


def _generate_extended_simulated_series(days_back: int = 120) -> pd.DataFrame:
    """
    Bootstrap a training dataset when the database doesn't yet hold enough real
    accumulated history (e.g. a fresh clone, or local dev without MongoDB running).

    Reuses the SAME physically-grounded diurnal-traffic / overnight-inversion /
    weather-correlated generator that powers live simulated ingestion and historical
    seeding elsewhere in the app (backend/services/data_ingestion.py), instead of
    drawing independent random features and fitting them to an unrelated invented
    linear formula.
    """
    from backend.services.data_ingestion import generate_simulated_readings

    stations_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "stations.json")
    with open(stations_path, "r", encoding="utf-8") as f:
        stations = json.load(f)

    end_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start_time = end_time - timedelta(days=days_back)

    rows = []
    for station in stations:
        if not station.get("active", True):
            continue
        current_time = start_time
        while current_time <= end_time:
            rows.append(generate_simulated_readings(station, current_time))
            current_time += timedelta(hours=1)

    return pd.DataFrame(rows)


def train_and_save_model():
    """
    Train the XGBoost forecaster and save it + its metadata to backend/ml/saved_models/.

    Prefers real accumulated readings from the database; falls back to an extended
    physically-grounded simulated series when there isn't enough real history yet.
    This is meant to be run as an offline step (`python -m backend.ml.train_model`),
    not automatically at API startup - training needs a stable, chronologically
    orderable dataset, which an import-time call can't reliably guarantee.
    """
    df = asyncio.run(_load_real_readings_from_db())
    data_source = "database_accumulated_history"
    if df is None:
        print("Not enough accumulated real readings in the database yet - bootstrapping "
              "training data from the physically-grounded simulator (diurnal traffic/"
              "inversion cycles, per-station/city profiles, weather correlation) instead "
              "of unrelated random draws.")
        df = _generate_extended_simulated_series(days_back=120)
        data_source = "extended_simulator_bootstrap"
    else:
        print(f"Training on {len(df)} real accumulated readings from the database.")

    engineered = _engineer_features(df)
    if len(engineered) < 200:
        raise RuntimeError("Insufficient data to train a meaningful model even after bootstrapping.")

    # Chronological split: the most recent 14 days are held out for testing. A random
    # split would leak future information into training for a time series and make
    # the reported RMSE meaningless.
    cutoff = engineered["timestamp"].max() - pd.Timedelta(days=14)
    train_df = engineered[engineered["timestamp"] <= cutoff]
    test_df = engineered[engineered["timestamp"] > cutoff]
    if len(test_df) < 50:
        split_idx = int(len(engineered) * 0.85)
        train_df = engineered.iloc[:split_idx]
        test_df = engineered.iloc[split_idx:]

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df["target"]
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df["target"]

    print(f"Training XGBoost Regressor on {len(train_df)} rows, evaluating on {len(test_df)} held-out rows...")
    model = XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    rmse = float(root_mean_squared_error(y_test, preds))

    # Persistence baseline comparison - the exact metric the problem statement's
    # evaluation focus calls out ("RMSE vs persistence baseline").
    persistence_rmse = float(root_mean_squared_error(y_test, test_df["persistence_pred"]))
    improvement_pct = round(100.0 * (persistence_rmse - rmse) / persistence_rmse, 1) if persistence_rmse else 0.0

    print(f"Model RMSE: {rmse:.2f} | Persistence baseline RMSE: {persistence_rmse:.2f} "
          f"({'better' if rmse < persistence_rmse else 'WORSE'} than baseline, "
          f"{improvement_pct:+.1f}% change)")

    model_path = os.path.join(os.path.dirname(__file__), "saved_models", "xgboost_aqi_model.joblib")
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

    metadata = {
        "rmse": rmse,
        "persistence_rmse": persistence_rmse,
        "improvement_pct": improvement_pct,
        "features": FEATURE_COLUMNS,
        "model_version": "xgboost_v2_real_features",
        "forecast_horizon_hours": FORECAST_HORIZON_HOURS,
        "data_source": data_source,
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "trained_at": pd.Timestamp.now().isoformat(),
    }
    metadata_path = os.path.join(os.path.dirname(__file__), "saved_models", "model_metadata.joblib")
    joblib.dump(metadata, metadata_path)

    return rmse


if __name__ == "__main__":
    train_and_save_model()
