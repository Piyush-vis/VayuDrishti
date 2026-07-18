"""Health impact engine tests — every number must be reproducible arithmetic
over the published coefficients (no invented values survive Q&A)."""
import asyncio
import json
import os
from datetime import datetime

from backend.models.database import db_helper
from backend.services.health_impact import (
    AQLI_YEARS_PER_UGM3,
    WHO_PM25_GUIDELINE,
    aqli_life_years_lost,
    health_impact_service,
    who_attributable_fraction,
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


def test_aqli_matches_published_coefficient():
    # Delhi-typical annual PM2.5 ~ 100 µg/m³ -> (100-5)*0.098 = 9.31 life-years
    assert aqli_life_years_lost(100.0) == round(95 * AQLI_YEARS_PER_UGM3, 2)
    # At/below the WHO guideline there is zero modelled loss
    assert aqli_life_years_lost(WHO_PM25_GUIDELINE) == 0.0
    assert aqli_life_years_lost(2.0) == 0.0
    # A Severe+ peak must be capped to an annual-equivalent, never absurd
    peak = aqli_life_years_lost(650.0)
    assert peak == round((130 - 5) * AQLI_YEARS_PER_UGM3, 2)
    assert peak < 13.0  # AQLI's documented ceiling for the worst regions


def test_who_attributable_fraction_monotonic_and_bounded():
    f0 = who_attributable_fraction(0.0)
    f_mid = who_attributable_fraction(50.0)
    f_high = who_attributable_fraction(200.0)
    assert f0 == 0.0
    assert 0.0 < f_mid < f_high < 1.0


def test_city_health_impact_severe_replay_is_large_but_finite():
    _fresh_seeded_db()
    peak = datetime(2025, 12, 14, 2, 0)
    result = asyncio.run(health_impact_service.city_health_impact("delhi", at=peak))
    assert result["available"]
    assert result["provenance"] == "replay"
    # Delhi's five curated stations sum to a multi-million exposed population
    assert result["exposed_population"] > 4_000_000
    # Severe+ PM2.5 -> large per-resident life-years lost, but a sane magnitude
    ly = result["lenses"]["aqli"]["life_years_lost_per_resident"]
    assert 5.0 < ly < 90.0
    assert result["lenses"]["who_mortality"]["excess_deaths_per_day"] > 0
    # Every lens carries its source string
    for lens in result["lenses"].values():
        assert lens.get("source")
    # Per-station list is exposure-ranked (highest impact first)
    deaths = [s["excess_daily_deaths"] for s in result["per_station"]]
    assert deaths == sorted(deaths, reverse=True)


def test_action_impact_reports_people_protected_and_deaths_averted():
    _fresh_seeded_db()
    peak = datetime(2025, 12, 14, 2, 0)
    result = asyncio.run(health_impact_service.action_impact("delhi", reduction_pct=30.0, at=peak))
    assert result["people_protected"] > 4_000_000
    assert result["pm25_after"] < result["pm25_modeled_baseline"]
    # At a Severe+ peak the benefit is modeled at the sustained-exposure ceiling
    assert result["modeled_at_sustained_exposure"] is True
    assert result["deaths_averted_per_day"] > 0
    assert result["life_years_restored_per_resident"] > 0
    # A bigger cut averts at least as many deaths
    bigger = asyncio.run(health_impact_service.action_impact("delhi", reduction_pct=60.0, at=peak))
    assert bigger["deaths_averted_per_day"] >= result["deaths_averted_per_day"]


def test_no_readings_returns_unavailable_not_crash():
    db_helper.use_mock_collections()  # empty, no stations
    result = asyncio.run(health_impact_service.city_health_impact("delhi"))
    assert result["available"] is False
