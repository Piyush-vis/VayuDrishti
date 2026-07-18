from fastapi import APIRouter, Query, HTTPException
from backend.services.prediction import prediction_service
from backend.services.replay import parse_at
from backend.models.database import db_helper

router = APIRouter(prefix="/predict", tags=["predict"])

@router.get("/forecast")
async def get_forecast(station_id: str, hours: int = Query(default=72), at: str = Query(default=None)):
    """
    Get 72-hour AQI prediction for a given station. With `at`, the forecast is
    computed as of that historical timestamp (replay mode).
    """
    try:
        forecast_data = await prediction_service.get_forecast_for_station(station_id, hours=hours, at=parse_at(at))
        return forecast_data
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/explain")
async def explain_forecast(station_id: str, horizon: int = Query(default=24, ge=6, le=72), at: str = Query(default=None)):
    """Exact TreeSHAP feature attribution for a station's forecast — the waterfall
    of what pushed the prediction up or down."""
    try:
        return await prediction_service.explain_forecast(station_id, horizon=horizon, at=parse_at(at))
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts")
async def get_alerts(city: str, threshold: float = Query(default=300.0), at: str = Query(default=None)):
    """
    Get stations in a city predicted to breach the specified AQI threshold in the next 24-72 hours.
    """
    try:
        alerts = await prediction_service.get_alerts_for_city(city, threshold=threshold, at=parse_at(at))
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trigger-forecast")
async def trigger_forecast(station_id: str = None):
    """
    Manually trigger AQI forecast generation. If no station_id is provided, triggers for all active stations.
    """
    try:
        if station_id:
            forecast_data = await prediction_service.get_forecast_for_station(station_id)
            return {"status": "success", "message": f"Forecast generated for {station_id}", "data": forecast_data}
        else:
            cursor = db_helper.stations.find({"active": True})
            stations = await cursor.to_list(length=100)
            
            count = 0
            for station in stations:
                try:
                    await prediction_service.get_forecast_for_station(station["station_id"])
                    count += 1
                except Exception:
                    pass
            return {"status": "success", "message": f"Forecasts triggered for {count}/{len(stations)} stations"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
