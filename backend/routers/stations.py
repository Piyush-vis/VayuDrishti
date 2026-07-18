from fastapi import APIRouter, Query, HTTPException
from backend.models.database import db_helper
from backend.services.replay import parse_at
from typing import List

router = APIRouter(prefix="/stations", tags=["stations"])

@router.get("/")
async def list_stations(city: str = None):
    """
    List all active monitoring stations. Optionally filter by city.
    """
    try:
        query = {"active": True}
        if city:
            query["city"] = city.lower()
            
        cursor = db_helper.stations.find(query)
        stations = await cursor.to_list(length=100)
        
        # motor returns raw mongo dicts (containing ObjectId which isn't JSON serializable directly)
        # we convert ObjectId to string or filter it out, pydantic schemas handle this too
        for s in stations:
            s["_id"] = str(s["_id"])
        return stations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{station_id}")
async def get_station(station_id: str):
    """
    Get details for a specific station.
    """
    station = await db_helper.stations.find_one({"station_id": station_id})
    if not station:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found.")
    station["_id"] = str(station["_id"])
    return station

@router.get("/{station_id}/readings")
async def get_readings(station_id: str, hours: int = Query(default=24, ge=1, le=168), at: str = Query(default=None)):
    """
    Get recent readings for a specific station. Max history: 168 hours (7 days).
    With `at`, the window ends at that historical timestamp (replay mode).
    """
    try:
        at_dt = parse_at(at)
        # Verify station exists
        station = await db_helper.stations.find_one({"station_id": station_id})
        if not station:
            raise HTTPException(status_code=404, detail=f"Station {station_id} not found.")

        # Get recent readings sorted by timestamp descending
        query = {"station_id": station_id}
        if at_dt is not None:
            query["timestamp"] = {"$lte": at_dt}
        cursor = db_helper.aqi_readings.find(query).sort("timestamp", -1).limit(hours)
        
        readings = await cursor.to_list(length=hours)
        readings.reverse()  # return in chronological order for graphs
        
        for r in readings:
            r["_id"] = str(r["_id"])
            
        return readings
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
