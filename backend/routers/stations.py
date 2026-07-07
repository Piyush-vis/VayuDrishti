from fastapi import APIRouter, Query

router = APIRouter(prefix="/stations", tags=["stations"])

@router.get("/")
async def list_stations(city: str = None):
    return {"message": f"List stations for city: {city}" if city else "List all stations"}

@router.get("/{station_id}")
async def get_station(station_id: str):
    return {"station_id": station_id, "message": "Get station details"}

@router.get("/{station_id}/readings")
async def get_readings(station_id: str, hours: int = Query(default=24)):
    return {"station_id": station_id, "hours": hours, "message": "Get station readings"}
