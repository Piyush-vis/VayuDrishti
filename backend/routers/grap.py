from fastapi import APIRouter, HTTPException, Query

from backend.services.grap import GRAP_ACTIONS, GRAP_STAGES, grap_service
from backend.services.replay import parse_at

router = APIRouter(prefix="/grap", tags=["grap"])


@router.get("/status")
async def get_grap_status(city: str, at: str = Query(default=None), horizon: int = Query(default=48, ge=6, le=72)):
    """Forecast-triggered GRAP evaluation for a city: current stage, projected
    stage with sustained-crossing ETA, trigger signal, lead time gained, and an
    auto-drafted CAQM-style invocation order when escalation is due.
    With `at`: evaluate as of a historical timestamp (replay mode)."""
    try:
        return await grap_service.evaluate_city(city.lower(), at=parse_at(at), horizon=horizon)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schedule")
async def get_grap_schedule():
    """The official CAQM stage thresholds and condensed statutory action lists."""
    return {
        "stages": GRAP_STAGES,
        "actions": GRAP_ACTIONS,
        "citation": "CAQM revised GRAP schedule, Dec 2024 (caqm.nic.in)",
    }
