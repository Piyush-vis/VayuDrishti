from fastapi import APIRouter, Query, HTTPException
from backend.services.attribution import attribution_service

router = APIRouter(prefix="/attribution", tags=["attribution"])

@router.get("/sources")
async def get_sources(city: str, zone: str = Query(default=None)):
    """
    Get the percentage breakdown of pollution sources (Vehicular, Industrial, Construction, etc.) for a city zone.
    """
    try:
        if not zone:
            # If no zone specified, use a default zone for the city
            default_zones = {
                "delhi": "East Delhi",
                "mumbai": "Mumbai Suburbs",
                "bengaluru": "South Bengaluru",
                "kolkata": "Central Kolkata",
                "chennai": "South Chennai",
                "hyderabad": "Central Hyderabad",
                "lucknow": "Central Lucknow",
                "jabalpur": "Central Jabalpur"
            }
            zone = default_zones.get(city.lower(), "Central Zone")
            
        data = await attribution_service.get_attribution_for_zone(city.lower(), zone)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evidence")
async def get_evidence(city: str, zone: str):
    """
    Get detailed evidence logs (active fires, traffic scores, weather parameters) backing the attribution.
    """
    try:
        data = await attribution_service.get_attribution_for_zone(city.lower(), zone)
        return {
            "zone": zone,
            "city": city,
            "timestamp": data["timestamp"],
            "evidence": data["evidence"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/industrial")
async def get_industrial_impact(city: str):
    """
    Get a catalog of major industrial zones in the city and their estimated contribution index.
    """
    try:
        data = await attribution_service.get_industrial_impact(city.lower())
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
