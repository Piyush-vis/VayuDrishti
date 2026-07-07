from fastapi import APIRouter

router = APIRouter(prefix="/data", tags=["data"])

@router.post("/ingest")
async def trigger_ingestion():
    return {"message": "Data ingestion triggered successfully"}

@router.get("/status")
async def get_ingestion_status():
    return {"message": "Data freshness status"}
