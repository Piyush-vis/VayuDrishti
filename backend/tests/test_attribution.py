"""
Attribution service tests.

Covers two past landmines:
1. The CITIES_COORDS NameError that used to crash GET /attribution/industrial for
   5 of the 8 covered cities.
2. The random-seeded fake covariates + missing confidence field found by the
   2026-07-19 code audit — attribution must now be fully deterministic, carry a
   real CPF-derived confidence, and label every evidence covariate's source.
"""
import asyncio
import inspect
import math
from datetime import datetime, timedelta

import backend.services.attribution as attribution_module
from backend.models.database import db_helper
from backend.services.attribution import (
    attribution_service,
    compute_cpf_rose,
    sector_index,
    percentile,
    bearing_deg,
)
from backend.services.data_ingestion import CITIES_COORDS


def test_get_industrial_impact_works_for_every_covered_city():
    for city in CITIES_COORDS.keys():
        result = asyncio.run(attribution_service.get_industrial_impact(city))
        assert isinstance(result, list)
        assert len(result) > 0
        for entry in result:
            assert "lat" in entry and "lon" in entry
            assert "name" in entry


def test_get_industrial_impact_unknown_city_falls_back_gracefully():
    result = asyncio.run(attribution_service.get_industrial_impact("some_未来_city"))
    assert isinstance(result, list)
    assert len(result) == 1
    assert "General Industrial Zone" in result[0]["name"]


def _circular_mean(degrees):
    sin_sum = sum(math.sin(math.radians(d)) for d in degrees)
    cos_sum = sum(math.cos(math.radians(d)) for d in degrees)
    return math.degrees(math.atan2(sin_sum, cos_sum)) % 360


def test_circular_mean_handles_wraparound_correctly():
    # A plain arithmetic mean of 350 and 10 gives 180 (exactly backwards) - the
    # circular mean should give ~0/360, since both readings are "northerly".
    result = _circular_mean([350, 10])
    assert result < 5 or result > 355


def test_circular_mean_matches_plain_average_away_from_wraparound():
    result = _circular_mean([80, 100])
    assert abs(result - 90) < 1e-6


# --- CPF wind-sector engine (the confidence backbone) ---

def test_no_random_module_anywhere_in_attribution():
    # Regression guard for the 2026-07-19 audit finding: attribution used
    # random.seed()-derived covariates presented as evidence. It must stay
    # fully deterministic.
    source = inspect.getsource(attribution_module)
    assert "import random" not in source
    assert "random.uniform" not in source
    assert "random.randint" not in source


def test_sector_index_boundaries():
    assert sector_index(0) == 0       # due north -> N
    assert sector_index(348.75) == 0  # N sector spans [348.75, 11.25)
    assert sector_index(11.24) == 0
    assert sector_index(90) == 4      # E
    assert sector_index(180) == 8     # S
    assert sector_index(315) == 14    # NW


def test_percentile_interpolates():
    vals = [10.0, 20.0, 30.0, 40.0]
    assert percentile(vals, 0) == 10.0
    assert percentile(vals, 100) == 40.0
    assert abs(percentile(vals, 50) - 25.0) < 1e-9


def _mk_reading(hours_ago, wind_dir, pm25, wind_speed=8.0, station_id="s1"):
    base = datetime(2025, 12, 13, 12, 0)
    return {
        "station_id": station_id, "city": "delhi",
        "timestamp": base - timedelta(hours=hours_ago),
        "aqi": 300, "pm25": pm25, "pm10": pm25 * 1.6, "no2": 40.0,
        "so2": 12.0, "o3": 20.0, "co": 1.2,
        "wind_direction": wind_dir, "wind_speed": wind_speed,
        "temperature": 12.0, "humidity": 60.0, "source": "test",
    }


def test_cpf_finds_the_polluting_sector():
    # 40 hours of clean southerly wind + 40 hours of dirty north-westerly wind:
    # CPF must identify NW as the dominant high-pollution sector.
    readings = [_mk_reading(i, 180, 60.0) for i in range(40)]
    readings += [_mk_reading(40 + i, 315, 400.0) for i in range(40)]
    rose = compute_cpf_rose(readings)
    assert rose["valid"]
    assert rose["dominant"]["sector"] == "NW"
    assert rose["dominant"]["cpf"] >= 0.9
    # Clean southerly sector must show ~zero conditional probability
    south = next(s for s in rose["sectors"] if s["sector"] == "S")
    assert south["cpf"] == 0.0


def test_cpf_excludes_calm_hours_and_survives_empty_input():
    calm = [_mk_reading(i, 90, 300.0, wind_speed=0.2) for i in range(10)]
    rose = compute_cpf_rose(calm)
    assert not rose["valid"]
    assert rose["calm_hours"] == 10
    assert compute_cpf_rose([])["valid"] is False


def test_bearing_deg_cardinal_directions():
    # From Delhi city centre due-north/east points
    assert abs(bearing_deg(28.0, 77.0, 29.0, 77.0) - 0.0) < 1.0
    assert abs(bearing_deg(28.0, 77.0, 28.0, 78.0) - 90.0) < 1.0


def _seed_mock_zone():
    db_helper.use_mock_collections()
    asyncio.run(db_helper.stations.insert_many([
        {"station_id": "delhi_test_1", "city": "delhi", "zone": "East Delhi",
         "name": "Test Station", "latitude": 28.65, "longitude": 77.31, "active": True},
    ]))
    base = datetime(2025, 12, 13, 12, 0)
    readings = [_mk_reading(i, 315, 380.0 - i, station_id="delhi_test_1") for i in range(60)]
    asyncio.run(db_helper.aqi_readings.insert_many(readings))
    return base


def test_attribution_payload_is_deterministic_and_carries_confidence():
    at = _seed_mock_zone()
    p1 = asyncio.run(attribution_service.get_attribution_for_zone("delhi", "East Delhi", at=at))
    p2 = asyncio.run(attribution_service.get_attribution_for_zone("delhi", "East Delhi", at=at))

    # Determinism: identical inputs -> identical outputs (no hidden randomness)
    assert p1["attributions"] == p2["attributions"]
    assert p1["evidence"] == p2["evidence"]
    assert p1["confidence"] == p2["confidence"]

    # PS requirement: attribution with confidence scores
    assert 0.0 <= p1["confidence"]["overall"] <= 1.0
    assert p1["confidence"]["band"] in ("low", "moderate", "high")
    assert set(p1["confidence"]["components"]) == {"wind_sector_cpf", "data_quality", "sample_size"}

    # Shares must sum to exactly 1.0 after rounding rebalance
    assert abs(sum(p1["attributions"].values()) - 1.0) < 1e-9

    # Every evidence covariate must carry an explicit source label
    for key in ("traffic_congestion_score", "nearby_industries",
                "active_construction_sites", "fire_hotspots_detected"):
        assert key in p1["evidence_sources"], key

    # Replay mode must be labelled and must not claim live provenance
    assert p1["provenance"] == "replay"

    # CPF rose over a NW-dominated seeded window must point NW
    assert p1["wind_rose"]["valid"]
    assert p1["wind_rose"]["dominant"]["sector"] == "NW"
    assert p1["sector_alignment"]["checked"]

    # Frontend contract keys unchanged (Dashboard + agents tool depend on these)
    assert set(p1["attributions"]) == {"vehicular", "industrial", "construction",
                                       "biomass_burning", "other"}
    assert {"traffic_congestion_score", "nearby_industries", "active_construction_sites",
            "fire_hotspots_detected", "wind_speed_kmh", "wind_direction_deg"} <= set(p1["evidence"])
