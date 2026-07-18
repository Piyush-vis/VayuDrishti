"""Back-trajectory engine tests."""
import asyncio
import json
import os
from datetime import datetime

from backend.models.database import db_helper
from backend.services.trajectory import (
    _dest_point,
    _point_to_segment_km,
    trajectory_service,
)
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


def test_dest_point_moves_north_and_east_correctly():
    # 111.32 km due north (bearing 0) ~ +1 degree latitude
    lat, lon = _dest_point(28.6, 77.2, 0.0, 111.32)
    assert abs(lat - 29.6) < 0.02
    assert abs(lon - 77.2) < 0.02
    # Due east (bearing 90)
    lat2, lon2 = _dest_point(28.6, 77.2, 90.0, 111.32)
    assert abs(lat2 - 28.6) < 0.02
    assert lon2 > 77.2


def test_point_to_segment_distance_zero_on_segment():
    d = _point_to_segment_km(28.6, 77.2, 28.0, 77.2, 29.0, 77.2)
    assert d < 1.0  # point lies on the meridian segment


def test_replay_trajectory_uses_transport_wind_and_reaches_punjab():
    _fresh_seeded_db()
    # Peak of the episode, from the worst hotspot station
    traj = asyncio.run(trajectory_service.back_trajectory(
        "delhi_anand_vihar", at=datetime(2025, 12, 14, 2, 0), hours=24
    ))
    assert traj["provenance"] == "replay"
    assert traj["wind_source"].startswith("transport")
    # 24h at ~19 km/h must carry the parcel a few hundred km toward the NW
    assert traj["total_travel_km"] > 300
    # Parcel origin is Delhi; the tail must reach Punjab/Haryana latitudes
    tail = traj["path"][-1]
    assert tail["lat"] > 29.5  # moved well north-west of Delhi (28.6)
    assert tail["lon"] < 77.2


def test_replay_trajectory_crosses_stubble_fires():
    _fresh_seeded_db()
    traj = asyncio.run(trajectory_service.back_trajectory(
        "delhi_anand_vihar", at=datetime(2025, 12, 14, 2, 0), hours=30
    ))
    assert traj["fires_total"] > 20
    assert traj["fires_crossed"] >= 1
    # Intersections are time-ordered and carry district provenance
    for hit in traj["intersections"]:
        assert "district" in hit
        assert hit["hours_ago"] >= 0
    assert "air mass" in traj["summary"].lower() or "no active fire" in traj["summary"].lower()


def test_live_mode_has_no_fires_without_feed():
    _fresh_seeded_db()
    traj = asyncio.run(trajectory_service.back_trajectory("delhi_anand_vihar", hours=12))
    assert traj["provenance"] == "live"
    # No FIRMS key configured in tests -> honest empty fire set, no crash
    assert traj["fires_total"] == 0
    assert traj["fires_crossed"] == 0
