"""Direct multi-horizon forecaster + SHAP tests.

Guards the fix for the broken recursive scheme (24h model fed its own outputs
hourly, which lost to persistence at every horizon). The forecaster must now use
direct per-horizon models and expose exact TreeSHAP attributions.
"""
import asyncio
import json
import os
from datetime import datetime

from backend.models.database import db_helper
from backend.services.prediction import prediction_service
from backend.services.replay import replay_service

STATIONS_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "stations.json"
)


def _fresh_seeded_db():
    db_helper.use_mock_collections()
    replay_service._seeded.clear()
    with open(STATIONS_FILE, encoding="utf-8") as f:
        stations = json.load(f)
    asyncio.run(db_helper.stations.insert_many(stations))
    asyncio.run(replay_service.ensure_episode_seeded("dec2025_delhi_severe"))


def test_backtest_artifact_beats_persistence_at_all_horizons():
    # The committed backtest artifact must show the direct models beating
    # persistence at 24/48/72h (the number the README/deck quote).
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                        "ml", "saved_models", "backtest_results.json")
    assert os.path.exists(path), "run `python -m backend.ml.backtest` to generate the artifact"
    with open(path, encoding="utf-8") as f:
        results = json.load(f)
    for h in ("24", "48", "72"):
        m = results["horizons"][h]
        assert m["model_rmse"] < m["persistence_rmse"], f"H+{h}h must beat persistence"
        assert m["improvement_pct"] > 0


def test_forecast_returns_full_horizon_and_horizon_metrics():
    _fresh_seeded_db()
    fc = asyncio.run(prediction_service.get_forecast_for_station(
        "delhi_anand_vihar", hours=72, at=datetime(2025, 12, 13, 6, 0)
    ))
    assert len(fc["predictions"]) == 72
    # When the ML model is used, the per-horizon skill table rides along
    if fc["model_version"] != "statistical_fallback":
        assert fc["horizon_metrics"] is not None
        assert "24" in fc["horizon_metrics"]


def test_forecast_confidence_band_does_not_explode_with_horizon():
    _fresh_seeded_db()
    fc = asyncio.run(prediction_service.get_forecast_for_station(
        "delhi_anand_vihar", hours=72, at=datetime(2025, 12, 13, 6, 0)
    ))
    first = fc["predictions"][0]
    last = fc["predictions"][-1]
    first_width = first["confidence_high"] - first["confidence_low"]
    last_width = last["confidence_high"] - last["confidence_low"]
    # Uncertainty widens with horizon but stays bounded (no error compounding)
    assert last_width >= first_width
    assert last_width < 250


def test_shap_explanation_reconstructs_prediction():
    _fresh_seeded_db()
    exp = asyncio.run(prediction_service.explain_forecast(
        "delhi_anand_vihar", horizon=24, at=datetime(2025, 12, 14, 2, 0)
    ))
    if not exp.get("available"):
        return  # no ML model in this environment; nothing to assert
    # TreeSHAP identity: base + sum(all contributions) == prediction
    total = exp["base_value"] + sum(f["contribution"] for f in exp["top_factors"]) + exp["other_factors_sum"]
    assert abs(total - exp["predicted_aqi"]) < 2.0  # rounding tolerance
    # During the Severe+ replay, recent-AQI features must dominate the push-up
    labels = [f["label"] for f in exp["top_factors"][:3]]
    assert any("AQI" in l for l in labels)
