"""Dec 2025 crisis replay tests.

The replay is the demo spine: every service must accept a historical `at`
timestamp and behave as of that moment, with honest provenance labels and
WITHOUT polluting live collections. These tests hit each service with
historical timestamps (plan.md T1-1 requirement).
"""
import asyncio
import json
import os
from datetime import datetime

from backend.models.database import db_helper
from backend.services.advisory import advisory_service
from backend.services.attribution import attribution_service
from backend.services.enforcement import enforcement_service
from backend.services.prediction import prediction_service
from backend.services.replay import replay_service, parse_at

STATIONS_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "stations.json"
)

EPISODE_ID = "dec2025_delhi_severe"
PEAK_HOUR = datetime(2025, 12, 14, 2, 0)      # 07:30 IST on the worst day
MID_EPISODE = datetime(2025, 12, 13, 6, 0)
BUILDUP = datetime(2025, 12, 12, 6, 0)


def _fresh_seeded_db():
    db_helper.use_mock_collections()
    replay_service._seeded.clear()
    with open(STATIONS_FILE, encoding="utf-8") as f:
        stations = json.load(f)
    asyncio.run(db_helper.stations.insert_many(stations))
    inserted = asyncio.run(replay_service.ensure_episode_seeded(EPISODE_ID))
    return inserted


def test_parse_at_strips_timezone():
    dt = parse_at("2025-12-13T06:00:00Z")
    assert dt == datetime(2025, 12, 13, 6, 0)
    assert dt.tzinfo is None
    assert parse_at(None) is None


def test_episode_loads_and_is_seedable_idempotently():
    inserted = _fresh_seeded_db()
    # 25 stations x 143h (11 Dec 00:00 -> 16 Dec 23:00 inclusive)
    assert inserted == 25 * 144
    # Second call must be a no-op (probe finds the final hour)
    assert asyncio.run(replay_service.ensure_episode_seeded(EPISODE_ID)) == 0


def test_replay_readings_reproduce_real_anchor_peaks():
    _fresh_seeded_db()
    reading = asyncio.run(db_helper.aqi_readings.find_one(
        {"station_id": "delhi_anand_vihar", "timestamp": {"$gte": PEAK_HOUR, "$lte": PEAK_HOUR}}
    ))
    # Real reported Anand Vihar peak on 13-14 Dec 2025 was AQI 644 - the
    # calibrated reconstruction must land within a few points of the anchor.
    assert reading is not None
    assert 630 <= reading["aqi"] <= 655
    assert reading["source"] == f"replay:{EPISODE_ID}"
    # Severe-episode meteorology: calm NW winds
    assert reading["wind_speed"] < 8.0
    assert 280 <= reading["wind_direction"] <= 340


def test_forecast_accepts_historical_timestamp_and_stays_ephemeral():
    _fresh_seeded_db()
    fc = asyncio.run(prediction_service.get_forecast_for_station(
        "delhi_anand_vihar", hours=48, at=BUILDUP
    ))
    assert fc["provenance"] == "replay"
    assert fc["as_of"] == BUILDUP
    assert len(fc["predictions"]) == 48
    # First forecast step must continue from the historical build-up level,
    # not from live/current data (which does not exist in the mock)
    assert fc["predictions"][0]["aqi"] > 250
    # Replay forecasts must NOT be persisted to the live prediction cache
    count = asyncio.run(db_helper.predictions.count_documents({}))
    assert count == 0


def test_attribution_uses_archived_episode_fires_in_replay():
    _fresh_seeded_db()
    payload = asyncio.run(attribution_service.get_attribution_for_zone(
        "delhi", "East Delhi", at=MID_EPISODE
    ))
    assert payload["provenance"] == "replay"
    assert payload["evidence_sources"]["fire_hotspots_detected"] == "archived:episode-firms"
    # Punjab/Haryana archived detections upwind of Delhi
    assert payload["evidence"]["fire_hotspots_detected"] >= 20
    assert 0.0 <= payload["confidence"]["overall"] <= 1.0


def test_enforcement_scan_at_peak_is_severe_and_ephemeral():
    _fresh_seeded_db()
    actions = asyncio.run(enforcement_service.get_actions_by_city("delhi", at=PEAK_HOUR))
    assert actions, "peak-hour replay scan must produce enforcement actions"
    assert all(a["provenance"] == "replay" for a in actions)
    # PM2.5 at Severe+ levels -> at least one critical (priority 1) action
    assert any(a["priority"] == 1 for a in actions)
    # Nothing persisted into the live enforcement queue
    count = asyncio.run(db_helper.enforcement_actions.count_documents({}))
    assert count == 0


def test_advisory_reflects_historical_severity_without_llm_or_persistence():
    _fresh_seeded_db()
    adv = asyncio.run(advisory_service.get_advisories_for_zone("delhi", "East Delhi", at=PEAK_HOUR))
    assert adv["provenance"] == "replay"
    assert adv["source"] == "template"
    assert adv["category"] == "Severe"
    # All 6 languages present for the general audience
    assert set(adv["advisories"]["general"].keys()) == {"en", "hi", "ta", "kn", "bn", "te"}
    count = asyncio.run(db_helper.citizen_advisories.count_documents({}))
    assert count == 0


def test_replay_and_live_data_coexist_without_collision():
    _fresh_seeded_db()
    # Insert a "live" reading (July 2026) for the same station
    live_ts = datetime(2026, 7, 19, 12, 0)
    asyncio.run(db_helper.aqi_readings.insert_one({
        "station_id": "delhi_anand_vihar", "city": "delhi", "timestamp": live_ts,
        "aqi": 95, "pm25": 30.0, "pm10": 70.0, "no2": 20.0, "so2": 8.0,
        "o3": 30.0, "co": 0.5, "wind_speed": 12.0, "wind_direction": 250,
        "source": "simulated",
    }))
    # Live view (no `at`): latest reading is the July one
    latest = asyncio.run(db_helper.aqi_readings.find_one(
        {"station_id": "delhi_anand_vihar"}, sort=[("timestamp", -1)]
    ))
    assert latest["aqi"] == 95
    # Replay view (`at` inside the episode): sees the December reading
    replay_reading = asyncio.run(db_helper.aqi_readings.find_one(
        {"station_id": "delhi_anand_vihar", "timestamp": {"$lte": PEAK_HOUR}},
        sort=[("timestamp", -1)]
    ))
    assert replay_reading["aqi"] > 600
