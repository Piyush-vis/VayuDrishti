from fastapi import APIRouter, HTTPException, BackgroundTasks
from backend.services.data_ingestion import ingest_all_cities, seed_historical_data
from backend.models.database import db_helper
from datetime import datetime

router = APIRouter(prefix="/data", tags=["data"])

@router.post("/ingest")
async def trigger_ingestion(background_tasks: BackgroundTasks):
    """
    Trigger live data ingestion in the background.
    """
    background_tasks.add_task(ingest_all_cities)
    return {"status": "success", "message": "Live data ingestion task dispatched to background."}

@router.post("/seed")
async def trigger_historical_seed(days: int = 7):
    """
    Trigger manual seeding of historical data for all stations.
    """
    try:
        records_seeded = await seed_historical_data(days_back=days)
        return {"status": "success", "records_seeded": records_seeded, "message": f"Successfully seeded {records_seeded} historical records."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_ingestion_status():
    """
    Return the counts and timestamps for database documents.
    """
    try:
        stations_count = await db_helper.stations.count_documents({})
        readings_count = await db_helper.aqi_readings.count_documents({})
        
        # Get latest reading timestamp
        latest_reading = await db_helper.aqi_readings.find_one(sort=[("timestamp", -1)])
        latest_timestamp = latest_reading["timestamp"] if latest_reading else None
        
        return {
            "status": "online",
            "timestamp": datetime.utcnow(),
            "counts": {
                "stations": stations_count,
                "aqi_readings": readings_count
            },
            "last_ingestion": latest_timestamp
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
