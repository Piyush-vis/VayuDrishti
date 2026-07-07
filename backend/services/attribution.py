import random
from datetime import datetime
from typing import Dict, Any, List
from backend.models.database import db_helper

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
            avg_wind_dir = int(sum(r.get("wind_direction") or 180 for r in readings) / len(readings))
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
        
        # If it's rush hour (8-10 AM or 6-9 PM), increase traffic score
        current_hour = datetime.utcnow().hour + 5.5  # Approximate IST
        if 8 <= current_hour <= 10 or 18 <= current_hour <= 21:
            traffic_score = min(1.0, traffic_score * 1.3)
            
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
        
        # Save to database
        await db_helper.source_attributions.insert_one(payload)
        
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
        }
        
        # Default fallback for other cities
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
