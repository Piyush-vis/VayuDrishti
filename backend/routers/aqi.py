from fastapi import APIRouter, Query, HTTPException
from backend.models.database import db_helper
from datetime import datetime, timedelta
from typing import List

router = APIRouter(prefix="/aqi", tags=["aqi"])

@router.get("/current")
async def get_current_aqi(city: str):
    """
    Get the most recent AQI and pollutant readings for all active stations in a city.
    """
    try:
        # Find all active stations in city
        cursor = db_helper.stations.find({"city": city.lower(), "active": True})
        stations = await cursor.to_list(length=100)
        
        results = []
        for station in stations:
            station_id = station["station_id"]
            # Fetch latest reading
            reading = await db_helper.aqi_readings.find_one(
                {"station_id": station_id},
                sort=[("timestamp", -1)]
            )
            
            if reading:
                reading["_id"] = str(reading["_id"])
                results.append({
                    "station": {
                        "station_id": station["station_id"],
                        "name": station["name"],
                        "latitude": station["latitude"],
                        "longitude": station["longitude"],
                        "zone": station["zone"]
                    },
                    "reading": reading
                })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/at")
async def get_aqi_at_time(city: str, hours_ago: int = Query(0, ge=0, le=168)):
    """
    Get, for every active station in a city, the real recorded reading closest to
    (now - hours_ago hours). Powers the map's historical timelapse slider with actual
    stored readings instead of a synthetic approximation.
    """
    try:
        target_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0) - timedelta(hours=hours_ago)

        cursor = db_helper.stations.find({"city": city.lower(), "active": True})
        stations = await cursor.to_list(length=100)

        results = []
        for station in stations:
            station_id = station["station_id"]
            if hours_ago == 0:
                reading = await db_helper.aqi_readings.find_one(
                    {"station_id": station_id},
                    sort=[("timestamp", -1)]
                )
            else:
                # Closest reading at or before the target hour, falling back to the
                # closest one after it if no earlier record exists.
                reading = await db_helper.aqi_readings.find_one(
                    {"station_id": station_id, "timestamp": {"$lte": target_time}},
                    sort=[("timestamp", -1)]
                )
                if not reading:
                    reading = await db_helper.aqi_readings.find_one(
                        {"station_id": station_id, "timestamp": {"$gte": target_time}},
                        sort=[("timestamp", 1)]
                    )

            if reading:
                reading["_id"] = str(reading["_id"])
                results.append({
                    "station": {
                        "station_id": station["station_id"],
                        "name": station["name"],
                        "latitude": station["latitude"],
                        "longitude": station["longitude"],
                        "zone": station["zone"]
                    },
                    "reading": reading
                })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def get_historical_aqi(station_id: str, start: str, end: str):
    """
    Get historical AQI readings for a station between two date strings (ISO format).
    """
    try:
        # Parse ISO dates. All stored reading timestamps are naive UTC (datetime.utcnow()),
        # so strip any parsed timezone info to avoid "can't compare offset-naive and
        # offset-aware datetimes" when the caller passes a "Z"-suffixed timestamp.
        try:
            start_date = datetime.fromisoformat(start.replace("Z", "+00:00")).replace(tzinfo=None)
            end_date = datetime.fromisoformat(end.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (e.g. YYYY-MM-DDTHH:MM:SSZ)")
            
        cursor = db_helper.aqi_readings.find({
            "station_id": station_id,
            "timestamp": {"$gte": start_date, "$lte": end_date}
        }).sort("timestamp", 1)
        
        readings = await cursor.to_list(length=1000)
        for r in readings:
            r["_id"] = str(r["_id"])
            
        return readings
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/heatmap")
async def get_heatmap_data(city: str):
    """
    Get latitude, longitude, and current AQI value for all stations in a city to draw the heatmap overlay.
    """
    try:
        cursor = db_helper.stations.find({"city": city.lower(), "active": True})
        stations = await cursor.to_list(length=100)
        
        heatmap_points = []
        for station in stations:
            station_id = station["station_id"]
            # Fetch latest reading
            reading = await db_helper.aqi_readings.find_one(
                {"station_id": station_id},
                sort=[("timestamp", -1)]
            )
            if reading:
                heatmap_points.append({
                    "lat": station["latitude"],
                    "lng": station["longitude"],
                    "value": reading["aqi"],
                    "station_name": station["name"]
                })
        return heatmap_points
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/compare")
async def compare_cities(cities: str = Query(..., description="Comma-separated list of cities to compare")):
    """
    Compare current average AQI and primary pollutants across multiple cities.
    """
    try:
        city_list = [c.strip().lower() for c in cities.split(",") if c.strip()]
        comparison = []
        
        for city in city_list:
            # Get active stations in city
            cursor = db_helper.stations.find({"city": city, "active": True})
            stations = await cursor.to_list(length=100)
            
            if not stations:
                continue
                
            station_ids = [s["station_id"] for s in stations]
            
            # Fetch latest reading for each station
            readings = []
            for s_id in station_ids:
                r = await db_helper.aqi_readings.find_one(
                    {"station_id": s_id},
                    sort=[("timestamp", -1)]
                )
                if r:
                    readings.append(r)
                    
            if not readings:
                continue
                
            # Compute averages
            avg_aqi = sum(r["aqi"] for r in readings) / len(readings)
            avg_pm25 = sum(r["pm25"] for r in readings) / len(readings)
            avg_pm10 = sum(r["pm10"] for r in readings) / len(readings)
            avg_no2 = sum(r["no2"] for r in readings) / len(readings)
            avg_so2 = sum(r["so2"] for r in readings) / len(readings)
            
            comparison.append({
                "city": city.capitalize(),
                "stations_count": len(readings),
                "avg_aqi": round(avg_aqi, 0),
                "avg_pm25": round(avg_pm25, 1),
                "avg_pm10": round(avg_pm10, 1),
                "avg_no2": round(avg_no2, 1),
                "avg_so2": round(avg_so2, 1)
            })
            
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
