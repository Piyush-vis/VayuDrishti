"""
Regression tests for backend/services/data_ingestion.py's AQI math.

These cover two bugs fixed during hardening: AQICN's per-pollutant iaqi values being
fed straight into calculate_indian_aqi() as if they were raw ug/m3 concentrations
(they are 0-500 sub-index numbers), and missing precipitation propagation.
"""
from datetime import datetime

from backend.services.data_ingestion import (
    calculate_indian_aqi,
    sub_index_to_concentration,
    generate_simulated_readings,
)


def test_calculate_indian_aqi_good_category():
    # Well within "Good" breakpoints for every pollutant
    aqi = calculate_indian_aqi(pm25=10, pm10=20, no2=10, so2=10, o3=10, co=0.3)
    assert 0 <= aqi <= 50


def test_calculate_indian_aqi_severe_category():
    aqi = calculate_indian_aqi(pm25=400, pm10=550, no2=500, so2=1800, o3=900, co=45)
    assert aqi > 400


def test_calculate_indian_aqi_is_max_of_subindices():
    # PM2.5 alone at the top of "Poor" (91-120 -> 200-300) should dominate a low SO2
    aqi = calculate_indian_aqi(pm25=120, pm10=10, no2=5, so2=5, o3=5, co=0.1)
    assert aqi >= 200


def test_sub_index_to_concentration_round_trips_through_naqi():
    # A sub-index of 100 for PM2.5 should map back to the PM2.5 breakpoint at NAQI=100 (60 ug/m3)
    concentration = sub_index_to_concentration("pm25", 100)
    assert concentration == 60

    # Feeding that concentration back through the real AQI calculation should reproduce
    # (approximately) the original sub-index for PM2.5 specifically.
    aqi = calculate_indian_aqi(pm25=concentration, pm10=0, no2=0, so2=0, o3=0, co=0)
    assert aqi == 100


def test_sub_index_to_concentration_handles_missing_or_zero():
    assert sub_index_to_concentration("pm25", None) == 0.0
    assert sub_index_to_concentration("pm25", 0) == 0.0


def test_sub_index_to_concentration_unknown_pollutant_returns_zero():
    assert sub_index_to_concentration("unknown_pollutant", 100) == 0.0


def test_generate_simulated_readings_shape_and_ranges():
    station = {
        "station_id": "delhi_anand_vihar",
        "city": "delhi",
        "name": "Anand Vihar, Delhi",
        "latitude": 28.6469,
        "longitude": 77.3164,
    }
    reading = generate_simulated_readings(station, datetime(2026, 1, 15, 8, 0, 0))

    required_fields = {
        "station_id", "city", "timestamp", "aqi", "pm25", "pm10", "no2", "so2", "o3",
        "co", "temperature", "humidity", "wind_speed", "wind_direction", "precipitation",
        "source",
    }
    assert required_fields.issubset(reading.keys())
    assert reading["source"] == "simulated"
    assert 0 <= reading["aqi"] <= 500
    assert 0 <= reading["wind_direction"] < 360
    assert reading["precipitation"] >= 0.0
