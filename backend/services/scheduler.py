import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from backend.services.data_ingestion import ingest_all_cities
from backend.services.enforcement import enforcement_service
from backend.models.database import db_helper

scheduler = AsyncIOScheduler()

async def periodic_ingestion():
    print(f"[{datetime.utcnow()}] Running scheduled data ingestion...")
    await ingest_all_cities()

async def periodic_enforcement_scan():
    print(f"[{datetime.utcnow()}] Running scheduled enforcement scan...")
    if db_helper.stations:
        cursor = db_helper.stations.find({"active": True})
        stations = await cursor.to_list(length=100)
        cities = list(set([s.get("city") for s in stations if s.get("city")]))
        for city in cities:
            await enforcement_service.scan_for_anomalies_and_generate_actions(city)

def start_scheduler():
    scheduler.add_job(periodic_ingestion, "interval", minutes=60)
    scheduler.add_job(periodic_enforcement_scan, "interval", minutes=65)
    scheduler.start()
    print("Background scheduler started.")
