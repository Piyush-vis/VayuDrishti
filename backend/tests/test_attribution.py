"""
Regression test for the CITIES_COORDS NameError that used to crash
GET /attribution/industrial for 5 of the 8 covered cities (attribution.py referenced
CITIES_COORDS without importing it, and only had catalog entries for delhi/mumbai/
bengaluru).
"""
import asyncio
import math

from backend.services.attribution import attribution_service
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
