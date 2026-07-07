import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

    # Collection accessors
    stations = None
    aqi_readings = None
    predictions = None
    source_attributions = None
    enforcement_actions = None
    citizen_advisories = None

    def connect(self):
        self.client = AsyncIOMotorClient(settings.MONGODB_URI)
        self.db = self.client[settings.DATABASE_NAME]
        
        # Initialize collections
        self.stations = self.db["stations"]
        self.aqi_readings = self.db["aqi_readings"]
        self.predictions = self.db["predictions"]
        self.source_attributions = self.db["source_attributions"]
        self.enforcement_actions = self.db["enforcement_actions"]
        self.citizen_advisories = self.db["citizen_advisories"]

    def disconnect(self):
        if self.client:
            self.client.close()

db_helper = Database()

# Startup Seeding Function
async def seed_database():
    try:
        # 1. Ensure connections are active
        if db_helper.db is None:
            db_helper.connect()
            
        # 2. Check if stations exist, if not seed them
        count = await db_helper.stations.count_documents({})
        if count == 0:
            stations_file_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)), "data", "stations.json"
            )
            if os.path.exists(stations_file_path):
                with open(stations_file_path, "r", encoding="utf-8") as f:
                    stations_data = json.load(f)
                
                # Insert all static stations
                await db_helper.stations.insert_many(stations_data)
                print(f"Seeded {len(stations_data)} static stations into MongoDB.")
            else:
                print(f"Warning: stations.json not found at {stations_file_path}")
        else:
            print(f"Database already contains {count} stations. Skipping seed.")
            
        # 3. Create Indexes for performance
        await db_helper.stations.create_index("station_id", unique=True)
        await db_helper.stations.create_index("city")
        await db_helper.aqi_readings.create_index([("station_id", 1), ("timestamp", -1)], unique=True)
        await db_helper.aqi_readings.create_index("city")
        await db_helper.predictions.create_index([("station_id", 1), ("generated_at", -1)])
        await db_helper.source_attributions.create_index([("zone", 1), ("timestamp", -1)])
        await db_helper.enforcement_actions.create_index([("city", 1), ("generated_at", -1)])
        await db_helper.citizen_advisories.create_index([("city", 1), ("zone", 1), ("generated_at", -1)])
        
        print("Database indexes created successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
