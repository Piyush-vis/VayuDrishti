import json
import os
import copy
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

class MockCursor:
    def __init__(self, items):
        self.items = items
        
    def sort(self, key_or_list, direction=None):
        if key_or_list:
            if isinstance(key_or_list, list):
                field, order = key_or_list[0]
            else:
                field, order = key_or_list, direction or 1
            
            # Simple sorter key fallback
            def get_val(x):
                val = x.get(field)
                if val is None:
                    return ""
                return val
                
            reverse = (order == -1)
            try:
                self.items = sorted(self.items, key=get_val, reverse=reverse)
            except Exception:
                pass
        return self

    def limit(self, count):
        self.items = self.items[:count]
        return self

    async def to_list(self, length=None):
        return self.items[:length] if length else self.items

class MockInsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class MockCollection:
    def __init__(self, name):
        self.name = name
        self.data = []

    def find(self, query=None, sort=None):
        filtered = self.data
        if query:
            # Basic key-value matching
            filtered = []
            for item in self.data:
                match = True
                for k, v in query.items():
                    item_val = item.get(k)
                    if isinstance(v, dict):
                        for op, op_val in v.items():
                            if op == "$in":
                                if item_val not in op_val:
                                    match = False
                                    break
                            elif op == "$gte":
                                if item_val is None or item_val < op_val:
                                    match = False
                                    break
                            elif op == "$lte":
                                if item_val is None or item_val > op_val:
                                    match = False
                                    break
                        if not match:
                            break
                    elif item_val != v:
                        match = False
                        break
                if match:
                    filtered.append(item)
                    
        cursor = MockCursor(filtered)
        if sort:
            cursor.sort(sort)
        return cursor

    async def find_one(self, query=None, sort=None):
        cursor = self.find(query, sort)
        items = await cursor.to_list(1)
        return items[0] if items else None

    async def insert_many(self, documents):
        docs = [copy.deepcopy(d) for d in documents]
        for idx, d in enumerate(docs):
            if "_id" not in d:
                d["_id"] = f"mock_id_{self.name}_{len(self.data) + idx}"
            self.data.append(d)
        return docs

    async def insert_one(self, document):
        doc = copy.deepcopy(document)
        if "_id" not in doc:
            doc["_id"] = f"mock_id_{self.name}_{len(self.data)}"
        self.data.append(doc)
        return MockInsertOneResult(doc["_id"])

    async def update_one(self, query, update, upsert=False):
        # Mock simple update/upsert for compliance marking
        item = await self.find_one(query)
        if item:
            if "$set" in update:
                for k, v in update["$set"].items():
                    item[k] = v
            return item
        elif upsert:
            # Handle simple upsert
            doc = copy.deepcopy(query)
            if "$set" in update:
                for k, v in update["$set"].items():
                    doc[k] = v
            await self.insert_one(doc)
            return doc
        return None

    async def delete_many(self, query):
        self.data = []
        return None

    async def count_documents(self, query):
        cursor = self.find(query)
        items = await cursor.to_list()
        return len(items)

    async def create_index(self, keys, unique=False):
        return None

class Database:
    client: AsyncIOMotorClient = None
    db = None
    is_connected = False

    # Collection accessors
    stations = None
    aqi_readings = None
    predictions = None
    source_attributions = None
    enforcement_actions = None
    citizen_advisories = None

    def connect(self):
        self.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
        self.db = self.client[settings.DATABASE_NAME]
        
        self.stations = self.db["stations"]
        self.aqi_readings = self.db["aqi_readings"]
        self.predictions = self.db["predictions"]
        self.source_attributions = self.db["source_attributions"]
        self.enforcement_actions = self.db["enforcement_actions"]
        self.citizen_advisories = self.db["citizen_advisories"]

    def use_mock_collections(self):
        self.stations = MockCollection("stations")
        self.aqi_readings = MockCollection("aqi_readings")
        self.predictions = MockCollection("predictions")
        self.source_attributions = MockCollection("source_attributions")
        self.enforcement_actions = MockCollection("enforcement_actions")
        self.citizen_advisories = MockCollection("citizen_advisories")
        self.is_connected = False

    def disconnect(self):
        if self.client and not isinstance(self.client, MockCollection):
            self.client.close()

db_helper = Database()

# Startup Seeding Function
async def seed_database():
    stations_file_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "data", "stations.json"
    )
    
    try:
        # 1. Ensure connections are active
        if db_helper.db is None:
            db_helper.connect()
            
        # Try to ping the database to verify active connection
        await db_helper.client.admin.command('ping')
        db_helper.is_connected = True
        print("Connected to MongoDB successfully.")
        
        # 2. Check if stations exist, if not seed them
        count = await db_helper.stations.count_documents({})
        if count == 0:
            if os.path.exists(stations_file_path):
                with open(stations_file_path, "r", encoding="utf-8") as f:
                    stations_data = json.load(f)
                await db_helper.stations.insert_many(stations_data)
                print(f"Seeded {len(stations_data)} static stations into MongoDB.")
        
        # 3. Create Indexes
        await db_helper.stations.create_index("station_id", unique=True)
        await db_helper.stations.create_index("city")
        await db_helper.aqi_readings.create_index([("station_id", 1), ("timestamp", -1)], unique=True)
        await db_helper.aqi_readings.create_index("city")
        
        # 4. Check if readings exist, if not seed
        readings_count = await db_helper.aqi_readings.count_documents({})
        if readings_count == 0:
            print("No AQI readings found. Seeding 7 days of historical hourly data automatically...")
            from backend.services.data_ingestion import seed_historical_data
            await seed_historical_data(days_back=7)
            
    except Exception as e:
        print(f"\n[WARNING] Could not connect to MongoDB: {e}")
        print("[STATUS] Activating local IN-MEMORY MOCK database mode...")
        
        # Load mock collections
        db_helper.use_mock_collections()
        
        # Seed the mock collection with stations and 7 days of historical data
        if os.path.exists(stations_file_path):
            with open(stations_file_path, "r", encoding="utf-8") as f:
                stations_data = json.load(f)
            await db_helper.stations.insert_many(stations_data)
            print(f"Seeded {len(stations_data)} static stations into in-memory mock database.")
            
            # Seed in-memory historical data
            print("Seeding 7 days of historical data in-memory...")
            from backend.services.data_ingestion import seed_historical_data
            await seed_historical_data(days_back=7)
            print("In-memory database initialized successfully.")
