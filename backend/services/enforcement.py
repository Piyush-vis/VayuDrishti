import os
from datetime import datetime, timedelta
from bson import ObjectId
from typing import List, Dict, Any, Optional
from backend.models.database import db_helper
from backend.models.schemas import EnforcementActionCreate

class EnforcementService:
    async def scan_for_anomalies_and_generate_actions(self, city: str, at: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Scan recent readings in the city for pollution breaches and generate
        priority-ranked enforcement action recommendations.

        `at`: scan as of a historical timestamp (replay mode) — actions are
        generated ephemerally and never persisted, so replay runs don't pollute
        the live enforcement queue.
        """
        replay_mode = at is not None
        now = at or datetime.utcnow()

        # Find active stations in city
        cursor = db_helper.stations.find({"city": city, "active": True})
        stations = await cursor.to_list(length=100)

        station_ids = [s["station_id"] for s in stations]
        station_map = {s["station_id"]: s for s in stations}

        # Fetch readings for the 6 hours leading up to `now`
        cutoff_time = now - timedelta(hours=6)
        cursor = db_helper.aqi_readings.find({
            "station_id": {"$in": station_ids},
            "timestamp": {"$gte": cutoff_time, "$lte": now}
        }).sort("timestamp", -1)
        recent_readings = await cursor.to_list(length=500)
        
        # Group readings by station
        readings_by_station = {}
        for r in recent_readings:
            s_id = r["station_id"]
            if s_id not in readings_by_station:
                readings_by_station[s_id] = []
            readings_by_station[s_id].append(r)
            
        generated_actions = []
        
        # Thresholds (CPCB standards or alert limits)
        limits = {
            "PM2.5": 120.0,  # 24hr standard is 60, alert at 120
            "PM10": 200.0,   # 24hr standard is 100, alert at 200
            "SO2": 80.0,     # alert at 80
            "NO2": 80.0      # alert at 80
        }
        
        for s_id, s_readings in readings_by_station.items():
            if not s_readings:
                continue
                
            station = station_map.get(s_id)
            if not station:
                continue
            latest = s_readings[0]
            
            # Analyze pollutants
            breaches = []
            for pollutant, limit in limits.items():
                val = 0.0
                if pollutant == "PM2.5": val = latest["pm25"]
                elif pollutant == "PM10": val = latest["pm10"]
                elif pollutant == "SO2": val = latest["so2"]
                elif pollutant == "NO2": val = latest["no2"]
                
                if val > limit:
                    # Count duration of consecutive breach
                    duration = 0
                    for r in s_readings:
                        r_val = r["pm25"] if pollutant == "PM2.5" else (r["pm10"] if pollutant == "PM10" else (r["so2"] if pollutant == "SO2" else r["no2"]))
                        if r_val > limit:
                            duration += 1
                        else:
                            break
                    breaches.append((pollutant, val, limit, duration))
            
            # Create enforcement recommendation if breaches exist
            for pollutant, current_level, threshold, duration in breaches:
                # Rank priority based on severity & duration
                severity_ratio = current_level / threshold
                priority = 3  # medium default
                if severity_ratio > 2.0 or duration >= 5:
                    priority = 1  # critical high
                elif severity_ratio > 1.4 or duration >= 3:
                    priority = 2  # high
                elif severity_ratio < 1.1 and duration <= 2:
                    priority = 4  # low
                    
                # Match nearby sources based on station/pollutant
                sources = ["General Local Emissions"]
                action_type = "inspect_general"
                title = f"Mitigate Emissions near {station['name']}"
                description = f"Elevated {pollutant} levels detected."
                
                if pollutant == "SO2":
                    sources = ["Industrial Stacks", "Refineries", "Brick Kilns"]
                    action_type = "inspect_industrial"
                    title = f"Deploy Industrial Emissions Inspector to {station['zone']}"
                    description = f"SO2 concentrations are {severity_ratio:.1f}x above safe limit for {duration} consecutive hours near {station['name']}. Likely source: upwind factory stacks."
                elif pollutant == "PM10":
                    sources = ["Construction Sites", "Road Dust Re-suspension"]
                    action_type = "enforce_dust_control"
                    title = f"Issue Dust Control Directive in {station['zone']}"
                    description = f"PM10 particulate matter is highly elevated ({current_level:.0f} µg/m³). Enforce wet suppression (water spraying) and green netting at construction sites in the vicinity."
                elif pollutant == "NO2":
                    sources = ["Vehicular Congestion", "Diesel Generator Sets"]
                    action_type = "reroute_traffic"
                    title = f"Implement Traffic Mitigation in {station['zone']}"
                    description = f"High vehicular NO2 detected during peak hours. Reroute heavy commercial traffic and deploy traffic police to clear bottlenecks."
                elif pollutant == "PM2.5":
                    # Check for biomass burning seasonal or regional
                    if latest["pm25"] > 200.0:
                        sources = ["Biomass / Stubble Burning", "Waste Burning"]
                        action_type = "suppress_biomass_burning"
                        title = f"Deploy Stubble Burning Suppression Team"
                        description = f"Extremely high PM2.5 levels ({current_level:.0f} µg/m³) detected. Correlate with active thermal satellite alerts to dispatch local fire patrol teams."
                    else:
                        sources = ["Vehicular Emissions", "Local Waste Combustions"]
                        action_type = "inspect_general"
                        title = f"Deploy Ambient Patrols to {station['zone']}"
                        description = f"PM2.5 level is {severity_ratio:.1f}x threshold. Deploy municipal patrols to check for open waste burning."

                # Create evidence structure
                evidence = {
                    "pollutant": pollutant,
                    "current_level": round(current_level, 1),
                    "threshold": threshold,
                    "duration_hours": duration,
                    "nearby_sources": sources,
                    "station_id": s_id
                }
                
                action_doc = {
                    "city": city,
                    "generated_at": now,
                    "priority": priority,
                    "action_type": action_type,
                    "title": title,
                    "description": description,
                    "evidence": evidence,
                    "status": "pending",
                    "provenance": "replay" if replay_mode else "live",
                }

                if replay_mode:
                    # Ephemeral: stable synthetic id, no persistence, no dedupe
                    # against the live queue.
                    action_doc["_id"] = f"replay_{s_id}_{pollutant}_{now.strftime('%Y%m%d%H')}"
                    generated_actions.append(action_doc)
                    continue

                # Check if an identical active alert already exists to prevent duplication
                exists = await db_helper.enforcement_actions.find_one({
                    "evidence.station_id": s_id,
                    "evidence.pollutant": pollutant,
                    "status": "pending"
                })

                if not exists:
                    # Save to db
                    res = await db_helper.enforcement_actions.insert_one(action_doc)
                    action_doc["_id"] = str(res.inserted_id)
                    generated_actions.append(action_doc)
                else:
                    exists["_id"] = str(exists["_id"])
                    generated_actions.append(exists)
                    
        # Return priority sorted actions
        return sorted(generated_actions, key=lambda x: x["priority"])

    async def get_actions_by_city(self, city: str, at: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Retrieve all active enforcement actions for a city.
        If empty, runs the scan first. In replay mode (`at` set) the stored
        queue is bypassed entirely — actions are recomputed as of `at`.
        """
        if at is not None:
            return await self.scan_for_anomalies_and_generate_actions(city, at=at)

        cursor = db_helper.enforcement_actions.find({"city": city}).sort("priority", 1)
        actions = await cursor.to_list(length=100)

        # Serialize ObjectIds to strings
        for a in actions:
            a["_id"] = str(a["_id"])

        if not actions:
            actions = await self.scan_for_anomalies_and_generate_actions(city)

        return actions

    async def get_action_by_id(self, action_id: str) -> Dict[str, Any]:
        """
        Retrieve a single action detail.
        """
        try:
            try:
                oid = ObjectId(action_id)
            except Exception:
                oid = action_id
            a = await db_helper.enforcement_actions.find_one({"_id": oid})
            if a:
                a["_id"] = str(a["_id"])
            return a
        except Exception:
            return None

    async def get_ai_analysis(self, action_id: str) -> Dict[str, Any]:
        """
        Run the Compound Risk Enforcement Intelligence Agent (backend/services/agents.py)
        against an already-detected rule-based breach. The agent independently
        cross-references source attribution and forecast trend data via tools to judge
        whether this is a genuine compound risk situation, then caches its verdict on
        the action document so repeat requests don't re-spend an LLM call.
        """
        action = await self.get_action_by_id(action_id)
        if not action:
            raise ValueError(f"Enforcement action {action_id} not found.")

        if action.get("ai_analysis"):
            return action

        from backend.services.agents import analyze_enforcement_action
        analysis = await analyze_enforcement_action(action)
        if analysis is None:
            raise RuntimeError(
                "AI compound-risk analysis is unavailable (no GROQ_API_KEY configured, "
                "or the agent call failed)."
            )

        try:
            oid = ObjectId(action_id)
        except Exception:
            oid = action_id
        await db_helper.enforcement_actions.update_one(
            {"_id": oid},
            {"$set": {"ai_analysis": analysis}}
        )
        action["ai_analysis"] = analysis
        return action

    async def update_action_status(self, action_id: str, status: str) -> bool:
        """
        Update the status of an enforcement action (pending, assigned, resolved).
        """
        try:
            try:
                oid = ObjectId(action_id)
            except Exception:
                oid = action_id
            res = await db_helper.enforcement_actions.update_one(
                {"_id": oid},
                {"$set": {"status": status}}
            )
            if hasattr(res, 'modified_count'):
                return res.modified_count > 0
            return res is not None
        except Exception:
            return False

enforcement_service = EnforcementService()
