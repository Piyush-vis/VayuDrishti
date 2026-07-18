from fastapi import APIRouter, HTTPException, Query

from backend.services.trajectory import trajectory_service
from backend.services.replay import parse_at

router = APIRouter(prefix="/trajectory", tags=["trajectory"])


@router.get("/back")
async def back_trajectory(
    station_id: str,
    hours: int = Query(default=24, ge=6, le=48),
    at: str = Query(default=None),
):
    """2D back-trajectory for a station's air mass, fused with fire detections.
    Returns the parcel path, fires crossed, and a plain-language causal summary.
    With `at`: replay mode (uses the episode's archived fires + wind regime)."""
    try:
        return await trajectory_service.back_trajectory(station_id, at=parse_at(at), hours=hours)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
