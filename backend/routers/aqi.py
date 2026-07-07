from fastapi import APIRouter, Query

router = APIRouter(prefix="/aqi", tags=["aqi"])

@router.get("/current")
async def get_current_aqi(city: str):
    return {"city": city, "message": "Current AQI for all stations in city"}

@router.get("/history")
async def get_historical_aqi(station_id: str, start: str, end: str):
    return {"station_id": station_id, "start": start, "end": end, "message": "Historical AQI readings"}

@router.get("/heatmap")
async def get_heatmap_data(city: str):
    return {"city": city, "message": "AQI heatmap data"}

@router.get("/compare")
async def compare_cities(cities: str = Query(..., description="Comma-separated list of cities")):
    return {"cities": cities.split(","), "message": "Multi-city AQI comparison data"}
