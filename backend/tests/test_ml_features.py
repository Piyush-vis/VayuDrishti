"""
Tests for the ML feature engineering pipeline rewritten in
backend/ml/train_model.py, which replaced a version that trained on 100% independent
random draws fit to an invented linear formula. These check that features are real
sequential (lag/rolling) values derived from the actual series, not something
disconnected from it.
"""
from datetime import datetime, timedelta

import pandas as pd

from backend.ml.train_model import _engineer_features, FEATURE_COLUMNS, FORECAST_HORIZON_HOURS


def _build_synthetic_series(station_id: str, hours: int, start_aqi: float, step: float):
    start = datetime(2026, 1, 1, 0, 0, 0)
    rows = []
    for i in range(hours):
        rows.append({
            "station_id": station_id,
            "city": "delhi",
            "timestamp": start + timedelta(hours=i),
            "aqi": start_aqi + step * i,
            "temperature": 30.0,
            "humidity": 50.0,
            "wind_speed": 5.0,
            "wind_direction": 180.0,
            "precipitation": 0.0,
        })
    return rows


def test_engineer_features_produces_all_expected_columns():
    # Needs at least aqi_t-24 (24h lookback) AND target=aqi_t+24 (24h lookahead) to
    # overlap in at least one row - use a generous window well past that minimum.
    rows = _build_synthetic_series("station_a", hours=80, start_aqi=100.0, step=1.0)
    df = pd.DataFrame(rows)

    engineered = _engineer_features(df)

    assert not engineered.empty
    for col in FEATURE_COLUMNS:
        assert col in engineered.columns
    assert "target" in engineered.columns


def test_engineer_features_lags_reflect_real_sequential_values():
    # AQI increases by exactly 1 per hour, so aqi_t-1 should be exactly aqi_t - 1 for
    # every row - proving the lag feature is a real shift of the actual series, not an
    # independently-drawn random correlate of it.
    rows = _build_synthetic_series("station_a", hours=80, start_aqi=100.0, step=1.0)
    df = pd.DataFrame(rows)

    engineered = _engineer_features(df)

    assert not engineered.empty  # guard against the assertions below passing vacuously
    assert (engineered["aqi_t"] - engineered["aqi_t-1"] == 1.0).all()
    assert (engineered["aqi_t"] - engineered["aqi_t-24"] == 24.0).all()


def test_engineer_features_target_is_real_future_value_not_current():
    rows = _build_synthetic_series("station_a", hours=80, start_aqi=100.0, step=2.0)
    df = pd.DataFrame(rows)

    engineered = _engineer_features(df)

    assert not engineered.empty
    # target = aqi FORECAST_HORIZON_HOURS ahead of aqi_t, and aqi increases by 2/hour
    expected_diff = 2.0 * FORECAST_HORIZON_HOURS
    assert (engineered["target"] - engineered["aqi_t"] == expected_diff).all()


def test_engineer_features_keeps_stations_independent():
    rows_a = _build_synthetic_series("station_a", hours=80, start_aqi=100.0, step=1.0)
    rows_b = _build_synthetic_series("station_b", hours=80, start_aqi=300.0, step=-1.0)
    df = pd.DataFrame(rows_a + rows_b)

    engineered = _engineer_features(df)

    # Station B's declining series should never leak a lag value from station A's
    # rising series (e.g. no negative diffs bleeding across the group boundary).
    b_rows = engineered[engineered["station_id"] == "station_b"]
    assert not b_rows.empty
    assert (b_rows["aqi_t"] - b_rows["aqi_t-1"] == -1.0).all()
