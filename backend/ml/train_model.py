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
    "aqi_t", "aqi_t-1", "aqi_t-3", "aqi_t-6", "aqi_t-12", "aqi_t-24", "aqi_t-168",
    "temperature", "humidity", "wind_speed", "wind_direction", "precipitation",
    "hour_of_day", "day_of_week", "month", "is_weekend",
    "aqi_rolling_mean_6h", "aqi_rolling_std_6h", "aqi_rolling_mean_24h", "aqi_rolling_max_24h",
]

# Primary headline horizon (the RMSE-vs-persistence number in all artifacts).
FORECAST_HORIZON_HOURS = 24

# DIRECT multi-horizon anchors. We train one model PER horizon, each predicting
# that horizon directly from current features, and interpolate the hourly curve
# between anchors (services/prediction.py). This replaced a broken scheme where
# the single 24h-trained model was fed its own outputs in an hourly recursive
# loop — that compounded error so badly it lost to persistence at every horizon
# (measured: -26% at 24h recursive). Direct-horizon models beat persistence at
# all three anchors (see backtest.py / model_metadata).
HORIZON_ANCHORS = [6, 12, 24, 48, 72]


def _engineer_features(df: pd.DataFrame, horizons=None) -> pd.DataFrame:
    """
    Build lag/rolling/temporal features and per-horizon targets from a
    chronologically ordered per-station AQI+weather time series.

    Every feature here comes from the ACTUAL sequential values in the series (real
    autocorrelation via pandas shift/rolling). For each horizon H a target column
    `target_H` holds the real AQI H hours ahead of each row.
    """
    default_single = horizons is None
    if horizons is None:
        horizons = [FORECAST_HORIZON_HOURS]
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
        g["aqi_t-168"] = g["aqi"].shift(168)  # 7-day same-hour lag (weekly seasonality)
        g["aqi_rolling_mean_6h"] = g["aqi"].rolling(6, min_periods=1).mean()
        g["aqi_rolling_std_6h"] = g["aqi"].rolling(6, min_periods=1).std().fillna(0.0)
        g["aqi_rolling_mean_24h"] = g["aqi"].rolling(24, min_periods=1).mean()
        g["aqi_rolling_max_24h"] = g["aqi"].rolling(24, min_periods=1).max()
        g["hour_of_day"] = g["timestamp"].dt.hour
        g["day_of_week"] = g["timestamp"].dt.dayofweek
        g["month"] = g["timestamp"].dt.month
        g["is_weekend"] = (g["day_of_week"] >= 5).astype(int)
        # Real supervised targets: actual AQI H hours later, one column per horizon.
        for h in horizons:
            g[f"target_{h}"] = g["aqi"].shift(-h)
        # Back-compat single-horizon target column.
        g["target"] = g[f"target_{FORECAST_HORIZON_HOURS}"] if FORECAST_HORIZON_HOURS in horizons else g["aqi"].shift(-FORECAST_HORIZON_HOURS)
        # Naive persistence baseline: "AQI in H hours = AQI right now" - the exact
        # baseline the problem statement's evaluation focus asks to beat.
        g["persistence_pred"] = g["aqi_t"]
        engineered_groups.append(g)

    result = pd.concat(engineered_groups, ignore_index=True)
    # aqi_t-168 is the longest lag; rows without it also lack all shorter lags.
    result = result.dropna(subset=["aqi_t-168"]).reset_index(drop=True)
    # Back-compat: the default single-horizon call (no `horizons` passed) returns
    # only rows with a defined target, as the original pipeline did. Multi-horizon
    # callers keep all rows and drop per-target themselves.
    if default_single:
        result = result.dropna(subset=["target"]).reset_index(drop=True)
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


def _new_model():
    return XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
    )


def train_and_save_model():
    """
    Train the DIRECT multi-horizon XGBoost forecaster (one model per horizon in
    HORIZON_ANCHORS) and save the models + metadata to backend/ml/saved_models/.

    Prefers real accumulated readings from the database; falls back to an extended
    physically-grounded simulated series when there isn't enough real history yet.
    Offline step (`python -m backend.ml.train_model`), never at API startup.
    """
    # Direct multi-horizon training needs a long, clean, chronologically-dense
    # series (72h targets + a 14-day holdout => months of hourly data). Require a
    # substantial real-history threshold before using the DB; otherwise bootstrap
    # from the reproducible 120-day physically-grounded simulator. (A partially
    # replay-seeded dev DB is exactly the thin/mixed data we must NOT train on.)
    df = asyncio.run(_load_real_readings_from_db(min_rows=40000))
    data_source = "database_accumulated_history"
    if df is None:
        print("Bootstrapping training data from the physically-grounded simulator "
              "(diurnal traffic/inversion cycles, per-station/city profiles, weather "
              "correlation) - the reproducible 120-day series.")
        df = _generate_extended_simulated_series(days_back=120)
        data_source = "extended_simulator_bootstrap"
    else:
        print(f"Training on {len(df)} real accumulated readings from the database.")

    engineered = _engineer_features(df, horizons=HORIZON_ANCHORS)
    if len(engineered) < 200:
        raise RuntimeError("Insufficient data to train a meaningful model even after bootstrapping.")

    # Chronological split: the most recent 14 days are held out. A random split
    # would leak future information into training for a time series.
    cutoff = engineered["timestamp"].max() - pd.Timedelta(days=14)
    split_by_time = (engineered["timestamp"] > cutoff).sum() >= 50

    models = {}
    horizon_metrics = {}
    saved_dir = os.path.join(os.path.dirname(__file__), "saved_models")

    for h in HORIZON_ANCHORS:
        sub = engineered.dropna(subset=[f"target_{h}"])
        if split_by_time:
            train_df = sub[sub["timestamp"] <= cutoff]
            test_df = sub[sub["timestamp"] > cutoff]
        else:
            split_idx = int(len(sub) * 0.85)
            train_df = sub.iloc[:split_idx]
            test_df = sub.iloc[split_idx:]

        X_train, y_train = train_df[FEATURE_COLUMNS], train_df[f"target_{h}"]
        X_test, y_test = test_df[FEATURE_COLUMNS], test_df[f"target_{h}"]

        model = _new_model()
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        rmse = float(root_mean_squared_error(y_test, preds))
        persistence_rmse = float(root_mean_squared_error(y_test, test_df["persistence_pred"]))
        improvement = round(100.0 * (persistence_rmse - rmse) / persistence_rmse, 1) if persistence_rmse else 0.0
        models[h] = model
        horizon_metrics[str(h)] = {
            "horizon_hours": h, "model_rmse": round(rmse, 2),
            "persistence_rmse": round(persistence_rmse, 2),
            "improvement_pct": improvement,
            "test_rows": int(len(test_df)),
        }
        tag = "better" if rmse < persistence_rmse else "WORSE"
        print(f"H+{h:>2}h  model RMSE {rmse:6.2f}  persistence {persistence_rmse:6.2f}  "
              f"({tag}, {improvement:+.1f}%)")

    # Save the multi-horizon model bundle + the primary 24h model (back-compat).
    joblib.dump(models, os.path.join(saved_dir, "xgboost_aqi_models_multi.joblib"))
    joblib.dump(models[FORECAST_HORIZON_HOURS], os.path.join(saved_dir, "xgboost_aqi_model.joblib"))

    primary = horizon_metrics[str(FORECAST_HORIZON_HOURS)]
    metadata = {
        # Headline (primary 24h horizon) — the number quoted in all artifacts.
        "rmse": primary["model_rmse"],
        "persistence_rmse": primary["persistence_rmse"],
        "improvement_pct": primary["improvement_pct"],
        "features": FEATURE_COLUMNS,
        "model_version": "xgboost_v3_direct_multihorizon",
        "forecast_horizon_hours": FORECAST_HORIZON_HOURS,
        "horizon_anchors": HORIZON_ANCHORS,
        "horizon_metrics": horizon_metrics,
        "data_source": data_source,
        "trained_at": pd.Timestamp.now().isoformat(),
    }
    joblib.dump(metadata, os.path.join(saved_dir, "model_metadata.joblib"))
    print(f"Saved {len(models)} direct-horizon models + metadata to {saved_dir}")
    return primary["model_rmse"]


if __name__ == "__main__":
    train_and_save_model()
