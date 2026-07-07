from fastapi import APIRouter, HTTPException, Query
from backend.services.advisory import advisory_service

router = APIRouter(prefix="/advisory", tags=["advisory"])

@router.get("/citizen")
async def get_advisory(city: str, zone: str = Query(default=None)):
    """
    Get citizen health advisory cards for a specific zone in all 6 target Indian languages.
    """
    try:
        if not zone:
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
            
        data = await advisory_service.get_advisories_for_zone(city, zone)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vulnerability-map")
async def get_vulnerability_map(city: str):
    """
    Get a geo-spatial coordinates listing of vulnerable zones (schools, hospitals, outdoor work zones) for map overlay.
    """
    try:
        data = await advisory_service.get_vulnerability_map_data(city)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate")
async def generate_advisory(city: str, zone: str):
    """
    Force manual generation of a fresh Gemini AI advisory.
    """
    try:
        # Clear existing cached advisories in the DB first
        from backend.models.database import db_helper
        await db_helper.citizen_advisories.delete_many({"city": city.lower(), "zone": zone})
        
        # Request new advisory
        data = await advisory_service.get_advisories_for_zone(city, zone)
        return {"status": "success", "message": "Forced Gemini advisory regeneration complete", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
