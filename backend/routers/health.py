from fastapi import APIRouter, HTTPException, Query

from backend.services.health_impact import health_impact_service
from backend.services.replay import parse_at

router = APIRouter(prefix="/health-impact", tags=["health-impact"])


@router.get("/city")
async def city_health_impact(city: str, at: str = Query(default=None)):
    """City-wide health impact across three cited lenses: AQLI life-years lost,
    WHO AirQ+ excess deaths, and population-weighted exposure."""
    try:
        return await health_impact_service.city_health_impact(city.lower(), at=parse_at(at))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/action")
async def action_impact(city: str, reduction_pct: float = Query(default=30.0, ge=1, le=100), at: str = Query(default=None)):
    """People protected + deaths averted if an intervention cuts city
    population-weighted PM2.5 by `reduction_pct` percent."""
    try:
        return await health_impact_service.action_impact(city.lower(), reduction_pct=reduction_pct, at=parse_at(at))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
