from fastapi import APIRouter

router = APIRouter(prefix="/advisory", tags=["advisory"])

@router.get("/citizen")
async def get_advisory(city: str, zone: str = None):
    return {"city": city, "zone": zone, "message": "Current health advisory"}

@router.get("/vulnerability-map")
async def get_vulnerability_map(city: str):
    return {"city": city, "message": "Schools, hospitals, and outdoor work zones data"}

@router.post("/generate")
async def generate_advisory():
    return {"message": "Trigger Gemini AI advisory generation"}
