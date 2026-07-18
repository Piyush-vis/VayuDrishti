"""Multi-horizon backtest: DIRECT forecaster RMSE vs persistence at 24/48/72h.

The PS evaluation focus names "RMSE vs a persistence baseline" explicitly. The
forecaster uses one model PER horizon, each predicting that horizon directly
(services/prediction.py). This script evaluates those direct models on a
chronologically held-out window and writes a JSON artifact that the README + a
Model Performance panel read from.

Honesty rules:
  - Evaluation only — no retraining here.
  - Numbers reported truthfully per horizon.
  - Deterministic / reproducible (fixed simulator series, no random draws in the
    evaluation path).

Run: python -m backend.ml.backtest
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import root_mean_squared_error

from backend.ml.train_model import (
    FEATURE_COLUMNS,
    _engineer_features,
    _generate_extended_simulated_series,
)

SAVED_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
MULTI_MODEL_PATH = os.path.join(SAVED_DIR, "xgboost_aqi_models_multi.joblib")
ARTIFACT_PATH = os.path.join(SAVED_DIR, "backtest_results.json")

HORIZONS = [24, 48, 72]


def run_backtest():
    if not os.path.exists(MULTI_MODEL_PATH):
        raise RuntimeError("No multi-horizon models. Run `python -m backend.ml.train_model` first.")
    models = joblib.load(MULTI_MODEL_PATH)

    # Independent evaluation series (physically-grounded simulator, 90 days),
    # generated fresh so the held-out tail is genuinely unseen relative to the
    # 120-day training series.
    df = _generate_extended_simulated_series(days_back=90)
    engineered = _engineer_features(df, horizons=HORIZONS)

    # Chronological holdout: last 14 days.
    cutoff = engineered["timestamp"].max() - pd.Timedelta(days=14)

    results = {
        "horizons": {},
        "evaluated_at": pd.Timestamp.now().isoformat(),
        "data_source": "physically_grounded_simulator_90d_holdout",
        "method": "direct per-horizon XGBoost vs naive persistence (AQI now)",
        "note": "Models frozen; direct multi-horizon evaluation of the production forecaster.",
    }

    for h in HORIZONS:
        if h not in models:
            continue
        sub = engineered.dropna(subset=[f"target_{h}"])
        test = sub[sub["timestamp"] > cutoff]
        if len(test) < 50:
            test = sub.iloc[int(len(sub) * 0.85):]
        X = test[FEATURE_COLUMNS]
        truth = test[f"target_{h}"].to_numpy()
        model_pred = models[h].predict(X)
        persist_pred = test["persistence_pred"].to_numpy()

        model_rmse = float(root_mean_squared_error(truth, model_pred))
        persist_rmse = float(root_mean_squared_error(truth, persist_pred))
        improvement = round(100.0 * (persist_rmse - model_rmse) / persist_rmse, 1) if persist_rmse else 0.0
        results["horizons"][str(h)] = {
            "horizon_hours": h,
            "model_rmse": round(model_rmse, 2),
            "persistence_rmse": round(persist_rmse, 2),
            "improvement_pct": improvement,
            "n_samples": int(len(truth)),
        }
        print(f"H+{h:>2}h  model RMSE {model_rmse:6.2f}  persistence {persist_rmse:6.2f}  "
              f"improvement {improvement:+.1f}%  (n={len(truth)})")

    with open(ARTIFACT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nBacktest artifact written to {ARTIFACT_PATH}")
    return results


if __name__ == "__main__":
    run_backtest()
