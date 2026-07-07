from fastapi import APIRouter, Query

router = APIRouter(prefix="/predict", tags=["predict"])

@router.get("/forecast")
async def get_forecast(station_id: str, hours: int = Query(default=72)):
    return {"station_id": station_id, "hours": hours, "message": "Get forecast"}

@router.get("/alerts")
async def get_alerts(city: str):
    return {"city": city, "message": "Get active alerts"}

@router.post("/trigger-forecast")
async def trigger_forecast():
    return {"message": "Manually trigger forecast generation"}
