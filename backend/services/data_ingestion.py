import asyncio
import httpx
import random
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any
from backend.config import settings
from backend.models.database import db_helper

# Throttle concurrent AQICN calls — the free tier rate-limits hard on burst requests.
# 5 simultaneous calls is a safe ceiling; the rest queue behind the semaphore.
_AQICN_SEMAPHORE = asyncio.Semaphore(5)

CITIES_COORDS = {
    "delhi": {"lat": 28.6139, "lon": 77.2090, "name": "Delhi"},
    "mumbai": {"lat": 19.0760, "lon": 72.8777, "name": "Mumbai"},
    "bengaluru": {"lat": 12.9716, "lon": 77.5946, "name": "Bengaluru"},
    "kolkata": {"lat": 22.5726, "lon": 88.3639, "name": "Kolkata"},
    "chennai": {"lat": 13.0827, "lon": 80.2707, "name": "Chennai"},
    "hyderabad": {"lat": 17.3850, "lon": 78.4867, "name": "Hyderabad"},
    "lucknow": {"lat": 26.8467, "lon": 80.9462, "name": "Lucknow"},
    "jabalpur": {"lat": 23.1815, "lon": 79.9864, "name": "Jabalpur"},
}

def calculate_indian_aqi(pm25: float, pm10: float, no2: float, so2: float, o3: float, co: float) -> int:
    """
    Calculate the Indian National Air Quality Index (NAQI) based on pollutant concentrations.
    """
    # Indian Sub-index breakpoints
    # PM2.5 (24-hr average): 0-30 (Good), 31-60 (Satisfactory), 61-90 (Moderate), 91-120 (Poor), 121-250 (Very Poor), 250+ (Severe)
    # PM10 (24-hr average): 0-50, 51-100, 101-250, 251-350, 351-430, 430+
    # NO2 (24-hr average): 0-40, 41-80, 81-180, 181-280, 281-400, 400+
    # SO2 (24-hr average): 0-40, 41-80, 81-380, 381-800, 801-1600, 1600+
    # O3 (1-hr average): 0-50, 51-100, 101-168, 169-208, 209-748, 748+
    # CO (8-hr average, mg/m3): 0-1, 1.1-2, 2.1-10, 10.1-17, 17.1-34, 34+
    
    def get_sub_index(val: float, breakpoints: List[float], index_bounds: List[int]) -> float:
        if val <= breakpoints[0]:
            # breakpoints[0] is always 0 in every table below, so this branch only
            # covers val <= 0 - guard the division instead of crashing on 0/0.
            if breakpoints[0] == 0:
                return 0.0
            return val * index_bounds[0] / breakpoints[0]
        for i in range(1, len(breakpoints)):
            if val <= breakpoints[i]:
                # Linear interpolation
                x0, x1 = breakpoints[i-1], breakpoints[i]
                y0, y1 = index_bounds[i-1], index_bounds[i]
                return y0 + (val - x0) * (y1 - y0) / (x1 - x0)
        # Severe overflow
        x0, x1 = breakpoints[-2], breakpoints[-1]
        y0, y1 = index_bounds[-2], index_bounds[-1]
        return y0 + (val - x0) * (y1 - y0) / (x1 - x0)

    # NAQI breakpoints categories: Good (50), Satisfactory (100), Moderate (200), Poor (300), Very Poor (400), Severe (500)
    naqi_bounds = [0, 50, 100, 200, 300, 400, 500]

    pm25_idx = get_sub_index(pm25, [0, 30, 60, 90, 120, 250, 500], naqi_bounds)
    pm10_idx = get_sub_index(pm10, [0, 50, 100, 250, 350, 430, 600], naqi_bounds)
    no2_idx = get_sub_index(no2, [0, 40, 80, 180, 280, 400, 600], naqi_bounds)
    so2_idx = get_sub_index(so2, [0, 40, 80, 380, 800, 1600, 2000], naqi_bounds)
    o3_idx = get_sub_index(o3, [0, 50, 100, 168, 208, 748, 1000], naqi_bounds)
    co_idx = get_sub_index(co, [0, 1, 2, 10, 17, 34, 50], naqi_bounds)

    # NAQI is the maximum of individual sub-indices
    # CPCB requires at least 3 parameters (one must be PM2.5 or PM10) to calculate NAQI
    return int(max(pm25_idx, pm10_idx, no2_idx, so2_idx, o3_idx, co_idx))

# CPCB sub-index breakpoint tables, shared with calculate_indian_aqi above, exposed here so
# AQICN's per-pollutant index readings (iaqi) can be inverted back into concentrations
# on the SAME scale calculate_indian_aqi expects. AQICN's iaqi.*.v values are AQI sub-index
# numbers (0-500), not raw ug/m3 concentrations -- feeding them straight into
# calculate_indian_aqi as if they were concentrations silently produced wrong AQI/pollutant
# values whenever the AQICN key was live.
_NAQI_BOUNDS = [0, 50, 100, 200, 300, 400, 500]
_CPCB_BREAKPOINTS = {
    "pm25": [0, 30, 60, 90, 120, 250, 500],
    "pm10": [0, 50, 100, 250, 350, 430, 600],
    "no2": [0, 40, 80, 180, 280, 400, 600],
    "so2": [0, 40, 80, 380, 800, 1600, 2000],
    "o3": [0, 50, 100, 168, 208, 748, 1000],
    "co": [0, 1, 2, 10, 17, 34, 50],
}

def sub_index_to_concentration(pollutant: str, index_value: float) -> float:
    """
    Invert a 0-500 AQI sub-index value back into an approximate raw concentration,
    using the same CPCB breakpoint table calculate_indian_aqi() uses going forward.
    This keeps AQICN-sourced readings dimensionally consistent with our own AQI math
    instead of treating an index number as if it were a concentration.
    """
    breakpoints = _CPCB_BREAKPOINTS.get(pollutant)
    if not breakpoints or index_value is None:
        return 0.0
    bounds = _NAQI_BOUNDS
    if index_value <= bounds[0]:
        return 0.0
    for i in range(1, len(bounds)):
        if index_value <= bounds[i]:
            x0, x1 = breakpoints[i-1], breakpoints[i]
            y0, y1 = bounds[i-1], bounds[i]
            if y1 == y0:
                return x0
            return x0 + (index_value - y0) * (x1 - x0) / (y1 - y0)
    # Overflow beyond 500 - extrapolate off the last segment
    x0, x1 = breakpoints[-2], breakpoints[-1]
    y0, y1 = bounds[-2], bounds[-1]
    return x0 + (index_value - y0) * (x1 - x0) / (y1 - y0)

def generate_simulated_readings(station: Dict[str, Any], timestamp: datetime) -> Dict[str, Any]:
    """
    Generate highly realistic simulated readings for a given station and timestamp.
    Incorporates:
    - Hour of day (traffic spikes, overnight temperature inversion)
    - City characteristics (Delhi is worse, Bangalore is moderate, Mumbai is coastal)
    - Station characteristics (Anand Vihar is a severe hotspot)
    - Weather influences
    """
    city = station["city"]
    station_id = station["station_id"]
    hour = timestamp.hour
    
    # 1. Base levels by city
    base_pm25 = 25.0
    base_pm10 = 45.0
    base_no2 = 15.0
    base_so2 = 5.0
    base_o3 = 20.0
    base_co = 0.5
    
    if city == "delhi":
        base_pm25 = 120.0
        base_pm10 = 200.0
        base_no2 = 45.0
        base_so2 = 12.0
        base_co = 1.4
    elif city == "lucknow":
        base_pm25 = 95.0
        base_pm10 = 160.0
        base_no2 = 35.0
        base_so2 = 10.0
        base_co = 1.1
    elif city == "mumbai" or city == "chennai" or city == "kolkata":
        base_pm25 = 45.0
        base_pm10 = 85.0
        base_no2 = 28.0
        base_so2 = 9.0
        base_co = 0.8
    elif city == "bengaluru" or city == "hyderabad":
        base_pm25 = 35.0
        base_pm10 = 65.0
        base_no2 = 22.0
        base_so2 = 6.0
        base_co = 0.6
    
    # 2. Station specific adjustments
    if station_id == "delhi_anand_vihar":
        base_pm25 *= 1.4
        base_pm10 *= 1.4
        base_so2 *= 2.0  # industrial stack emissions
    elif station_id == "delhi_rk_puram":
        base_pm25 *= 0.85
        base_pm10 *= 0.85
    elif station_id == "bengaluru_silk_board":
        base_pm25 *= 1.3  # heavy vehicle congestion
        base_no2 *= 1.5
    elif station_id == "mumbai_colaba":
        base_pm25 *= 0.7  # clean coastal breeze
    elif station_id == "chennai_manali":
        base_so2 *= 2.5  # refinery/petrochemical industrial zone
        base_pm25 *= 1.2
        
    # 3. Hourly diurnal profiles
    # Traffic peaks: 8-10 AM, 6-9 PM
    traffic_factor = 1.0
    if 8 <= hour <= 10 or 18 <= hour <= 21:
        traffic_factor = 1.45
    elif 1 <= hour <= 5:
        traffic_factor = 0.6
        
    # Overnight inversion: pollutants accumulate from midnight to 7 AM
    inversion_factor = 1.0
    if 0 <= hour <= 7:
        inversion_factor = 1.35
    elif 12 <= hour <= 16:
        inversion_factor = 0.75  # midday sun disperses pollution
        
    # Apply factors to pollutants
    pm25 = base_pm25 * inversion_factor * random.uniform(0.85, 1.15)
    pm10 = base_pm10 * inversion_factor * traffic_factor * random.uniform(0.85, 1.15)
    no2 = base_no2 * traffic_factor * random.uniform(0.8, 1.2)
    so2 = base_so2 * random.uniform(0.9, 1.1)
    o3 = base_o3 * (1.5 if 12 <= hour <= 16 else 0.5) * random.uniform(0.8, 1.2)  # O3 peaks in sun
    co = base_co * traffic_factor * inversion_factor * random.uniform(0.85, 1.15)
    
    # 4. Generate weather conditions
    # Delhi is hot/dry, Mumbai/Chennai are humid/rainy, Bangalore is cool
    temp = 25.0
    humidity = 60.0
    wind_spd = 8.0
    wind_dir = 180.0
    precipitation = 0.0
    
    if city == "delhi" or city == "lucknow":
        temp = 38.0 - abs(hour - 14) * 0.8
        humidity = 40.0 + abs(hour - 14) * 1.2
        wind_spd = 5.0 + random.uniform(0, 5)
        wind_dir = 270.0 + random.uniform(-30, 30)  # Western winds
    elif city == "mumbai" or city == "chennai":
        temp = 32.0 - abs(hour - 14) * 0.3
        humidity = 80.0 - abs(hour - 14) * 0.8
        wind_spd = 12.0 + random.uniform(0, 6)
        wind_dir = 240.0 + random.uniform(-20, 20)  # Sea breeze
    elif city == "bengaluru":
        temp = 27.0 - abs(hour - 14) * 0.6
        humidity = 65.0 - abs(hour - 14) * 1.0
        wind_spd = 10.0 + random.uniform(0, 5)
        wind_dir = 90.0 + random.uniform(-40, 40)

    # High-humidity conditions carry a chance of rain, which washes out particulates
    if humidity > 75 and random.random() < 0.25:
        precipitation = round(random.uniform(0.2, 8.0), 1)
        pm25 *= 0.7
        pm10 *= 0.7

    aqi = calculate_indian_aqi(pm25, pm10, no2, so2, o3, co)

    return {
        "station_id": station_id,
        "city": city,
        "timestamp": timestamp,
        "aqi": aqi,
        "pm25": round(pm25, 1),
        "pm10": round(pm10, 1),
        "no2": round(no2, 1),
        "so2": round(so2, 1),
        "o3": round(o3, 1),
        "co": round(co, 2),
        "temperature": round(temp, 1),
        "humidity": round(humidity, 1),
        "wind_speed": round(wind_spd, 1),
        "wind_direction": int(wind_dir) % 360,
        "precipitation": precipitation,
        "source": "simulated"
    }

async def fetch_openmeteo_weather(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetch real weather data from Open-Meteo API.
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json().get("current", {})
                return {
                    "temperature": data.get("temperature_2m"),
                    "humidity": data.get("relative_humidity_2m"),
                    "wind_speed": data.get("wind_speed_10m"),
                    "wind_direction": data.get("wind_direction_10m"),
                    "precipitation": data.get("precipitation")
                }
    except Exception as e:
        print(f"Error fetching Open-Meteo weather: {e}")
    return {}

async def fetch_aqicn_aqi(station_name: str) -> Dict[str, Any]:
    """
    Fetch real air quality data from AQICN API.
    Rejects stale feeds (>48h old) or sensor fault sentinels (e.g. 999) so the
    ingestion pipeline falls back cleanly to live OpenWeatherMap data.
    """
    if not settings.AQICN_API_KEY:
        return {}
        
    url = f"https://api.waqi.info/feed/{station_name}/?token={settings.AQICN_API_KEY}"
    try:
        async with _AQICN_SEMAPHORE:  # cap concurrent AQICN requests to 5
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    body = resp.json()
                    if body.get("status") == "ok":
                        data = body.get("data", {})

                        # Staleness check: reject readings older than 48 hours
                        time_epoch = data.get("time", {}).get("v")
                        if time_epoch:
                            age_hours = (time.time() - time_epoch) / 3600.0
                            if age_hours > 48:
                                return {}

                        iaqi = data.get("iaqi", {})

                        def clean_sub_index(pol: str) -> float:
                            v = iaqi.get(pol, {}).get("v")
                            # 999, negative, or > 500 are WAQI sensor fault / offline sentinels
                            if v is None or v >= 500 or v < 0:
                                return 0.0
                            return sub_index_to_concentration(pol, v)

                        pm25 = clean_sub_index("pm25")
                        pm10 = clean_sub_index("pm10")
                        no2  = clean_sub_index("no2")
                        so2  = clean_sub_index("so2")
                        o3   = clean_sub_index("o3")
                        co   = clean_sub_index("co")

                        # If no valid particulate reading exists, fall back to OWM
                        if pm25 == 0.0 and pm10 == 0.0 and no2 == 0.0:
                            return {}

                        return {
                            "aqi_source": data.get("aqi"),
                            "pm25": pm25,
                            "pm10": pm10,
                            "no2": no2,
                            "so2": so2,
                            "o3": o3,
                            "co": co
                        }
    except Exception as e:
        # Log the exception type so empty-message errors are still identifiable
        print(f"Error fetching AQICN AQI ({type(e).__name__}): {e}")
    return {}

async def fetch_openweathermap_aqi(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetch air pollution data from OpenWeatherMap API.

    Unit note: OWM returns ALL components in µg/m³, including CO.
    CPCB NAQI breakpoints for CO use mg/m³ (0-1, 1-2, 2-10, 10-17, 17-34, 34+).
    CO must be divided by 1000 before passing to calculate_indian_aqi().
    All other pollutants (PM2.5, PM10, NO2, SO2, O3) are already in µg/m³ — no conversion needed.
    """
    if not getattr(settings, "OPENWEATHERMAP_API_KEY", None):
        return {}
        
    url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={settings.OPENWEATHERMAP_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                body = resp.json()
                if "list" in body and len(body["list"]) > 0:
                    components = body["list"][0].get("components", {})
                    return {
                        "pm25": components.get("pm2_5", 0.0),
                        "pm10": components.get("pm10", 0.0),
                        "no2": components.get("no2", 0.0),
                        "so2": components.get("so2", 0.0),
                        "o3": components.get("o3", 0.0),
                        # OWM gives CO in µg/m³; CPCB breakpoints use mg/m³ → ÷1000
                        "co": components.get("co", 0.0) / 1000.0,
                    }
    except Exception as e:
        print(f"Error fetching OpenWeatherMap AQI: {e}")
    return {}

async def ingest_live_data_for_station(station: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ingest live air quality and weather data for a single station.
    Priority:
      1. AQICN via known aqicn_uid (most reliable — direct numeric ID)
      2. AQICN via name keyword search (fallback for unmapped stations)
      3. OpenWeatherMap lat/lon API
      4. Simulated data (last resort)
    Weather always comes from Open-Meteo (free, no key needed).
    """
    station_id = station["station_id"]
    lat = station["latitude"]
    lon = station["longitude"]
    city = station["city"]
    
    timestamp = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    
    # 1. Real weather always from Open-Meteo (free, no API key needed)
    weather_data = await fetch_openmeteo_weather(lat, lon)
    
    # 2. Fetch AQI data — prefer known UID, fall through chain
    aqi_data = {}
    data_source = "simulated"

    if getattr(settings, "AQICN_API_KEY", None):
        uid = station.get("aqicn_uid")
        if uid:
            # Use numeric UID directly — 100% reliable match
            aqi_data = await fetch_aqicn_aqi(f"@{uid}")
            if aqi_data:
                data_source = "live:aqicn"
        
        if not aqi_data:
            # Fallback: name-based search (works for stations not yet mapped)
            search_keyword = station["name"].split(",")[0]
            aqi_data = await fetch_aqicn_aqi(search_keyword)
            if aqi_data:
                data_source = "live:aqicn"

    if not aqi_data and getattr(settings, "OPENWEATHERMAP_API_KEY", None):
        aqi_data = await fetch_openweathermap_aqi(lat, lon)
        if aqi_data:
            data_source = "live:owm"
        
    # 3. Build reading
    if aqi_data:
        pm25 = aqi_data.get("pm25") or random.uniform(20.0, 50.0)
        pm10 = aqi_data.get("pm10") or random.uniform(40.0, 80.0)
        no2  = aqi_data.get("no2")  or random.uniform(10.0, 30.0)
        so2  = aqi_data.get("so2")  or random.uniform(2.0, 10.0)
        o3   = aqi_data.get("o3")   or random.uniform(15.0, 35.0)
        co   = aqi_data.get("co")   or random.uniform(0.2, 0.8)
        
        aqi = calculate_indian_aqi(pm25, pm10, no2, so2, o3, co)
        
        temp  = weather_data.get("temperature")  or random.uniform(20.0, 35.0)
        hum   = weather_data.get("humidity")      or random.uniform(40.0, 80.0)
        w_spd = weather_data.get("wind_speed")    or random.uniform(2.0, 12.0)
        w_dir = weather_data.get("wind_direction") or random.randint(0, 359)
        precip = weather_data.get("precipitation") or 0.0

        reading = {
            "station_id": station_id,
            "city": city,
            "timestamp": timestamp,
            "aqi": aqi,
            "pm25": round(pm25, 1),
            "pm10": round(pm10, 1),
            "no2": round(no2, 1),
            "so2": round(so2, 1),
            "o3": round(o3, 1),
            "co": round(co, 2),
            "temperature": round(temp, 1),
            "humidity": round(hum, 1),
            "wind_speed": round(w_spd, 1),
            "wind_direction": int(w_dir),
            "precipitation": round(precip, 1),
            "source": data_source,
        }
    else:
        # Simulator last resort
        reading = generate_simulated_readings(station, timestamp)
        reading["source"] = "simulated"
        if weather_data:
            reading["temperature"]    = weather_data.get("temperature", reading["temperature"])
            reading["humidity"]       = weather_data.get("humidity", reading["humidity"])
            reading["wind_speed"]     = weather_data.get("wind_speed", reading["wind_speed"])
            reading["wind_direction"] = weather_data.get("wind_direction", reading["wind_direction"])
            reading["precipitation"]  = weather_data.get("precipitation") or 0.0
            reading["aqi"] = calculate_indian_aqi(
                reading["pm25"], reading["pm10"], reading["no2"],
                reading["so2"], reading["o3"], reading["co"]
            )
            
    # 4. Upsert to DB
    try:
        await db_helper.aqi_readings.update_one(
            {"station_id": station_id, "timestamp": timestamp},
            {"$set": reading},
            upsert=True
        )
    except Exception as e:
        print(f"Error saving reading for {station_id}: {e}")
        
    return reading


async def ingest_all_cities():
    """
    Ingest live data for all stations in database.
    """
    if db_helper.stations is None:
        db_helper.connect()
        
    cursor = db_helper.stations.find({"active": True})
    stations = await cursor.to_list(length=100)
    
    tasks = [ingest_live_data_for_station(station) for station in stations]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    success_count = sum(1 for r in results if isinstance(r, dict))
    print(f"Live data ingestion finished. Successful: {success_count}/{len(stations)}")
    return {"total": len(stations), "successful": success_count}

async def seed_historical_data(days_back: int = 7):
    """
    Seed historical readings for all stations going back N days.
    Uses bulk insert_many batches for ultra-fast startup (<1s vs >2mins).
    """
    if db_helper.stations is None:
        db_helper.connect()
        
    cursor = db_helper.stations.find({"active": True})
    stations = await cursor.to_list(length=100)
    
    end_time = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    start_time = end_time - timedelta(days=days_back)
    
    all_readings = []
    print(f"Generating {days_back} days of historical data for {len(stations)} stations...")
    
    for station in stations:
        current_time = start_time
        while current_time <= end_time:
            reading = generate_simulated_readings(station, current_time)
            all_readings.append(reading)
            current_time += timedelta(hours=1)
            
    # Bulk insert in chunks of 2000
    total_inserted = 0
    chunk_size = 2000
    for i in range(0, len(all_readings), chunk_size):
        chunk = all_readings[i:i + chunk_size]
        try:
            res = await db_helper.aqi_readings.insert_many(chunk, ordered=False)
            total_inserted += len(res.inserted_ids)
        except Exception:
            # Handles duplicate key gracefully if some records already exist
            pass
            
    print(f"Seeding completed. Total historical records created: {total_inserted}")
    return total_inserted
