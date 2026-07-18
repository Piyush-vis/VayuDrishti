import random
import math
from datetime import datetime
import httpx
from typing import Dict, Any, List
from backend.models.database import db_helper
from backend.config import settings
from backend.services.data_ingestion import CITIES_COORDS

async def fetch_firms_hotspots(lat: float, lon: float, radius_deg: float = 2.0) -> int:
    """Fetch active fire hotspots from NASA FIRMS API within a bounding box."""
    if not getattr(settings, "NASA_FIRMS_MAP_KEY", None):
        return -1
    
    west = lon - radius_deg
    east = lon + radius_deg
    south = lat - radius_deg
    north = lat + radius_deg
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{settings.NASA_FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/{west},{south},{east},{north}/1"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                lines = resp.text.strip().split('\n')
                if len(lines) > 1:
                    return len(lines) - 1
            return 0
    except Exception as e:
        print(f"Error fetching NASA FIRMS data: {e}")
        return -1

async def fetch_tomtom_traffic_score(lat: float, lon: float) -> float:
    """Fetch real-time traffic congestion score from TomTom API."""
    if not getattr(settings, "TOMTOM_API_KEY", None):
        return -1.0
        
    url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key={settings.TOMTOM_API_KEY}&point={lat},{lon}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if "flowSegmentData" in data:
                    flow = data["flowSegmentData"]
                    current_speed = flow.get("currentSpeed", 1)
                    free_flow = flow.get("freeFlowSpeed", 1)
                    congestion = 1.0 - (current_speed / free_flow)
                    return max(0.0, min(1.0, congestion))
    except Exception as e:
        print(f"Error fetching TomTom data: {e}")
    return -1.0

class AttributionService:
    async def get_attribution_for_zone(self, city: str, zone: str) -> Dict[str, Any]:
        """
        Get or calculate source attribution percentages for a given zone.
        """
        # Find latest readings for stations in this zone to ground the analysis
        cursor = db_helper.stations.find({"city": city, "zone": zone, "active": True})
        stations = await cursor.to_list(length=20)
        
        # If no stations in zone, fallback to citywide
        if not stations:
            cursor = db_helper.stations.find({"city": city, "active": True})
            stations = await cursor.to_list(length=100)
            
        station_ids = [s["station_id"] for s in stations]
        
        # Fetch latest reading for these stations
        cursor = db_helper.aqi_readings.find(
            {"station_id": {"$in": station_ids}}
        ).sort("timestamp", -1).limit(len(station_ids))
        readings = await cursor.to_list(length=len(station_ids))
        
        # Compute average pollutants in zone
        avg_aqi = 150.0
        avg_pm25 = 60.0
        avg_pm10 = 100.0
        avg_no2 = 30.0
        avg_so2 = 10.0
        avg_co = 0.8
        avg_wind_dir = 180
        avg_wind_spd = 5.0
        
        if readings:
            avg_aqi = sum(r["aqi"] for r in readings) / len(readings)
            avg_pm25 = sum(r["pm25"] for r in readings) / len(readings)
            avg_pm10 = sum(r["pm10"] for r in readings) / len(readings)
            avg_no2 = sum(r["no2"] for r in readings) / len(readings)
            avg_so2 = sum(r["so2"] for r in readings) / len(readings)
            avg_co = sum(r["co"] for r in readings) / len(readings)
            # Circular mean for wind direction — a plain arithmetic mean is wrong
            # near the 0/360 wraparound (e.g. 350deg and 10deg should average to 0, not 180).
            wind_dirs = [r.get("wind_direction") or 180 for r in readings]
            sin_sum = sum(math.sin(math.radians(d)) for d in wind_dirs)
            cos_sum = sum(math.cos(math.radians(d)) for d in wind_dirs)
            avg_wind_dir = int(math.degrees(math.atan2(sin_sum, cos_sum)) % 360)
            avg_wind_spd = sum(r.get("wind_speed") or 5.0 for r in readings) / len(readings)
            
        # Determine environmental parameters
        # Generate spatial parameters based on city and zone
        # We model traffic, industry count, construction, and active fires in zone
        random.seed(hash(zone + city) + datetime.now().day)
        
        traffic_score = 0.4 + random.uniform(0.1, 0.4)  # 0.5 to 0.8
        industrial_count = random.randint(1, 15)
        construction_count = random.randint(1, 10)
        
        # Biomass burning: Delhi/Lucknow have crop fires in winter (e.g. October-November)
        # We can simulate active fires based on month or randomize slightly
        is_crop_burning_season = datetime.now().month in [10, 11]
        fire_count = random.randint(5, 35) if (city in ["delhi", "lucknow"] and is_crop_burning_season) else random.randint(0, 4)
        
        # NASA FIRMS Integration
        if stations:
            st = stations[0]
            lat = st.get("latitude")
            lon = st.get("longitude")
            if lat and lon:
                firms_count = await fetch_firms_hotspots(lat, lon, 2.0)
                if firms_count != -1:
                    fire_count = firms_count
        
        # If it's rush hour (8-10 AM or 6-9 PM), increase traffic score fallback
        current_hour = datetime.utcnow().hour + 5.5  # Approximate IST
        if 8 <= current_hour <= 10 or 18 <= current_hour <= 21:
            traffic_score = min(1.0, traffic_score * 1.3)
            
        # TomTom Traffic Integration
        if stations:
            st = stations[0]
            lat = st.get("latitude")
            lon = st.get("longitude")
            if lat and lon:
                real_traffic = await fetch_tomtom_traffic_score(lat, lon)
                if real_traffic != -1.0:
                    traffic_score = real_traffic
            
        # --- Source Signature Calculations ---
        # 1. Vehicular signature: High NO2 and CO, peaks during rush hours
        veh_raw = traffic_score * 40.0 + (avg_no2 * 0.5)
        
        # 2. Industrial signature: High SO2 and constant level
        ind_raw = industrial_count * 5.0 + (avg_so2 * 1.5)
        
        # 3. Construction dust: High PM10 relative to PM2.5
        pm_ratio = avg_pm10 / max(1.0, avg_pm25)
        con_raw = construction_count * 6.0 + (pm_ratio * 15.0)
        
        # 4. Biomass burning: High PM2.5 and CO, fire hotspots
        bio_raw = fire_count * 15.0 + (avg_pm25 * 0.4)
        
        # 5. Background / Other
        oth_raw = 15.0 + random.uniform(0, 10)
        
        # Sum and normalize to percentages
        total = veh_raw + ind_raw + con_raw + bio_raw + oth_raw
        
        attributions = {
            "vehicular": round(veh_raw / total, 2),
            "industrial": round(ind_raw / total, 2),
            "construction": round(con_raw / total, 2),
            "biomass_burning": round(bio_raw / total, 2),
            "other": round(oth_raw / total, 2)
        }
        
        # Recalibrate to sum to exactly 1.0 (handling rounding float errors)
        attr_sum = sum(attributions.values())
        if attr_sum != 1.0:
            diff = round(1.0 - attr_sum, 2)
            attributions["other"] = round(attributions["other"] + diff, 2)
            
        evidence = {
            "traffic_congestion_score": round(traffic_score, 2),
            "nearby_industries": industrial_count,
            "active_construction_sites": construction_count,
            "fire_hotspots_detected": fire_count,
            "wind_speed_kmh": round(avg_wind_spd, 1),
            "wind_direction_deg": avg_wind_dir
        }
        
        payload = {
            "zone": zone,
            "city": city,
            "timestamp": datetime.utcnow(),
            "attributions": attributions,
            "evidence": evidence
        }
        
        # Note: motor's insert_one() mutates `payload` in place, adding a raw (non-JSON-
        # serializable) ObjectId as "_id" - strip it before returning, since this
        # response's schema doesn't expose an _id field. The in-memory mock DB used
        # when MongoDB is unreachable deep-copies before inserting, so this only bites
        # with a real MongoDB connection.
        await db_helper.source_attributions.insert_one(payload)
        payload.pop("_id", None)

        return payload

    async def get_industrial_impact(self, city: str) -> List[Dict[str, Any]]:
        """
        Return coordinates and impact ratings of industrial zones in a city.
        Uses static catalog simulated for the hackathon.
        """
        # Delhi industrial areas: Okhla, Wazirpur, Anand Vihar, Mayapuri
        # Mumbai industrial areas: Kurla, Chembur, Thane
        # Bangalore: Peenya, Bommasandra, Whitefield
        catalog = {
            "delhi": [
                {"name": "Anand Vihar Industrial Area", "lat": 28.6502, "lon": 77.3120, "industry_type": "Manufacturing & Power", "impact": "High", "index": 85},
                {"name": "Okhla Industrial Area Ph 1", "lat": 28.5283, "lon": 77.2795, "industry_type": "Electronics & Textile", "impact": "Medium", "index": 60},
                {"name": "Wazirpur Industrial Area", "lat": 28.6995, "lon": 77.1654, "industry_type": "Metal Plating & Chemical", "impact": "High", "index": 92},
                {"name": "Mayapuri Industrial District", "lat": 28.6291, "lon": 77.1189, "industry_type": "Scrap & Metal works", "impact": "Medium", "index": 55}
            ],
            "mumbai": [
                {"name": "Chembur Refinery Cluster", "lat": 19.0163, "lon": 72.8988, "industry_type": "Petrochemical & Fertilizer", "impact": "High", "index": 88},
                {"name": "Thane Belapur Industrial Belt", "lat": 19.1121, "lon": 73.0118, "industry_type": "Chemicals & Processing", "impact": "High", "index": 82},
                {"name": "Kurla Industrial Estates", "lat": 19.0680, "lon": 72.8850, "industry_type": "Light Engineering", "impact": "Medium", "index": 58}
            ],
            "bengaluru": [
                {"name": "Peenya Industrial Area", "lat": 13.0298, "lon": 77.5180, "industry_type": "Heavy Machinery & Casting", "impact": "High", "index": 78},
                {"name": "Bommasandra Industrial Belt", "lat": 12.8095, "lon": 77.6890, "industry_type": "Manufacturing & Pharma", "impact": "Medium", "index": 62},
                {"name": "Whitefield IT & Export Park", "lat": 12.9850, "lon": 77.7420, "industry_type": "IT & Assemblies", "impact": "Low", "index": 25}
            ],
            "kolkata": [
                {"name": "Howrah Industrial Belt", "lat": 22.5958, "lon": 88.2636, "industry_type": "Foundry & Engineering", "impact": "High", "index": 80},
                {"name": "Batanagar Industrial Estate", "lat": 22.4735, "lon": 88.2296, "industry_type": "Leather & Rubber", "impact": "Medium", "index": 58},
                {"name": "Kasba Industrial Estate", "lat": 22.5187, "lon": 88.3866, "industry_type": "Light Engineering", "impact": "Low", "index": 32}
            ],
            "chennai": [
                {"name": "Manali Refinery Complex", "lat": 13.1667, "lon": 80.2593, "industry_type": "Petrochemical & Refinery", "impact": "High", "index": 90},
                {"name": "Ambattur Industrial Estate", "lat": 13.1143, "lon": 80.1548, "industry_type": "Manufacturing & Tanneries", "impact": "High", "index": 75},
                {"name": "Guindy Industrial Estate", "lat": 13.0067, "lon": 80.2136, "industry_type": "Light Engineering & Electronics", "impact": "Medium", "index": 48}
            ],
            "hyderabad": [
                {"name": "Patancheru Industrial Area", "lat": 17.5297, "lon": 78.2662, "industry_type": "Bulk Drugs & Pharma", "impact": "High", "index": 87},
                {"name": "IDA Bollaram", "lat": 17.5450, "lon": 78.3480, "industry_type": "Pharma & Chemicals", "impact": "High", "index": 79},
                {"name": "Jeedimetla Industrial Area", "lat": 17.5093, "lon": 78.4457, "industry_type": "Chemicals & Manufacturing", "impact": "Medium", "index": 64}
            ],
            "lucknow": [
                {"name": "Amausi Industrial Area", "lat": 26.7606, "lon": 80.8759, "industry_type": "Manufacturing & Leather", "impact": "Medium", "index": 55},
                {"name": "Talkatora Industrial Area", "lat": 26.8395, "lon": 80.8734, "industry_type": "Light Engineering", "impact": "Medium", "index": 50}
            ],
            "jabalpur": [
                {"name": "Richhai Industrial Growth Centre", "lat": 23.2144, "lon": 79.9853, "industry_type": "Ordnance & Heavy Engineering", "impact": "Medium", "index": 52},
                {"name": "Adhartal Industrial Area", "lat": 23.2100, "lon": 79.9186, "industry_type": "Manufacturing", "impact": "Low", "index": 35}
            ],
        }

        # Default fallback for any city not yet in the catalog
        if city not in catalog:
            coords = CITIES_COORDS.get(city, {"lat": 20.0, "lon": 78.0})
            return [
                {
                    "name": f"{city.capitalize()} General Industrial Zone",
                    "lat": coords["lat"] + 0.04,
                    "lon": coords["lon"] - 0.03,
                    "industry_type": "Manufacturing",
                    "impact": "Medium",
                    "index": 50
                }
            ]

        return catalog[city]

attribution_service = AttributionService()
