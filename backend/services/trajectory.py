"""HYSPLIT-lite 2D back-trajectory engine fused with fire detections.

Given a receptor station and a time, integrate the air parcel BACKWARD hour by
hour through the wind field and test whether its path crossed active fire
detections upwind — turning "biomass burning is a source" into visual, causal
provenance: "this air mass passed over N active Punjab crop fires ~18h ago."

Method & honest limitations (stated in the API response and on-screen):
  - 2D kinematic back-trajectory (no vertical motion / mixing-height dynamics).
  - Wind field is approximated from station meteorology advected over the
    region, not a full gridded reanalysis — wind-field error dominates the
    uncertainty, exactly as it does in operational HYSPLIT.
  - This is a screening/attribution-corroboration tool, not a dispersion model.

In replay mode the episode's archived fire points and calm-NW wind regime are
used, so the demo runs with zero external dependencies.
"""

import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from backend.models.database import db_helper

EARTH_KM_PER_DEG = 111.32
CORRIDOR_WIDTH_DEG = 0.35   # ~39 km half-width fire-intersection corridor


def _dest_point(lat: float, lon: float, bearing_deg: float, dist_km: float) -> tuple:
    """Move `dist_km` from (lat, lon) toward `bearing_deg` (planar approximation,
    adequate at trajectory scales of a few hundred km)."""
    rad = math.radians(bearing_deg)
    dlat = (dist_km * math.cos(rad)) / EARTH_KM_PER_DEG
    dlon = (dist_km * math.sin(rad)) / (EARTH_KM_PER_DEG * max(0.2, math.cos(math.radians(lat))))
    return lat + dlat, lon + dlon


def _point_to_segment_km(plat: float, plon: float, alat: float, alon: float, blat: float, blon: float) -> float:
    """Approximate distance (km) from point P to segment AB in local planar coords."""
    coslat = math.cos(math.radians((alat + blat) / 2.0))
    ax, ay = alon * coslat, alat
    bx, by = blon * coslat, blat
    px, py = plon * coslat, plat
    dx, dy = bx - ax, by - ay
    seg_len2 = dx * dx + dy * dy
    if seg_len2 == 0:
        t = 0.0
    else:
        t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / seg_len2))
    cx, cy = ax + t * dx, ay + t * dy
    return math.hypot(px - cx, py - cy) * EARTH_KM_PER_DEG


class TrajectoryService:
    async def _wind_series(self, station_id: str, end: datetime, hours: int) -> List[Dict[str, Any]]:
        """Hourly wind vectors (speed, from-direction) at or before `end`,
        newest first — used as the advecting field for the parcel."""
        cursor = db_helper.aqi_readings.find({
            "station_id": station_id,
            "timestamp": {"$lte": end},
        }).sort("timestamp", -1).limit(hours + 1)
        readings = await cursor.to_list(length=hours + 1)
        return readings

    async def back_trajectory(self, station_id: str, at: Optional[datetime] = None, hours: int = 24) -> Dict[str, Any]:
        """Compute the back-trajectory and its fire intersections."""
        station = await db_helper.stations.find_one({"station_id": station_id})
        if not station:
            raise ValueError(f"Station {station_id} not found.")

        replay_mode = at is not None
        end = (at or datetime.utcnow()).replace(minute=0, second=0, microsecond=0)
        winds = await self._wind_series(station_id, end, hours)

        # Build an hour->wind lookup; fall back to the most recent wind when a
        # specific hour is missing.
        wind_by_hour: Dict[datetime, Dict[str, Any]] = {r["timestamp"]: r for r in winds}
        latest_wind = winds[0] if winds else None

        # In replay mode use the episode's boundary-layer TRANSPORT wind, not the
        # surface calm (which traps local emissions but doesn't advect the parcel).
        replay_service = None
        wind_source = "surface:station-readings"
        if replay_mode:
            from backend.services.replay import replay_service as _rs
            replay_service = _rs
            if replay_service.transport_wind(end) is not None:
                wind_source = "transport:episode-boundary-layer"

        lat, lon = station["latitude"], station["longitude"]
        path = [{
            "lat": round(lat, 4), "lon": round(lon, 4),
            "hours_ago": 0, "timestamp": end,
        }]

        t = end
        for h in range(1, hours + 1):
            if wind_source.startswith("transport") and replay_service is not None:
                wr = replay_service.transport_wind(t, hour_index=h)
            else:
                wr = wind_by_hour.get(t) or latest_wind
            if wr is None:
                break
            # Meteorological convention: wind_direction is the bearing the wind
            # comes FROM, which is exactly the direction to step the parcel back.
            from_bearing = wr.get("wind_direction")
            speed = wr.get("wind_speed") or 0.0
            if from_bearing is None:
                from_bearing = 270
            dist_km = max(0.0, speed) * 1.0  # 1-hour step
            lat, lon = _dest_point(lat, lon, from_bearing, dist_km)
            t = t - timedelta(hours=1)
            path.append({
                "lat": round(lat, 4), "lon": round(lon, 4),
                "hours_ago": h, "timestamp": t,
            })

        fires = await self._fire_points(station["city"], end, replay_mode)
        intersections = self._intersect(path, fires)

        total_travel_km = 0.0
        for i in range(1, len(path)):
            total_travel_km += self._segment_km(path[i - 1], path[i])

        return {
            "station_id": station_id,
            "station_name": station["name"],
            "city": station["city"],
            "origin": {"lat": station["latitude"], "lon": station["longitude"]},
            "as_of": end,
            "provenance": "replay" if replay_mode else "live",
            "hours": hours,
            "path": path,
            "total_travel_km": round(total_travel_km, 0),
            "fires_total": len(fires),
            "fires_crossed": len(intersections),
            "all_fires": fires,
            "intersections": intersections,
            "summary": self._summary(intersections, path),
            "wind_source": wind_source,
            "method": "2D kinematic back-trajectory advected by the boundary-layer transport wind",
            "limitations": (
                "2D (no vertical motion or mixing-height dynamics); wind field "
                "approximated from boundary-layer transport meteorology, not "
                "gridded reanalysis; a screening/corroboration tool, not a "
                "dispersion model. Surface winds during the episode are calm — "
                "the transport wind aloft is what advects stubble smoke."
            ),
        }

    async def _fire_points(self, city: str, at: datetime, replay_mode: bool) -> List[Dict[str, Any]]:
        if replay_mode:
            from backend.services.replay import replay_service
            return replay_service.fire_points(at)
        # Live mode: NASA FIRMS integration would populate this; empty is honest
        # when no fire feed/key is configured.
        return []

    def _segment_km(self, a: Dict[str, Any], b: Dict[str, Any]) -> float:
        coslat = math.cos(math.radians((a["lat"] + b["lat"]) / 2.0))
        dx = (b["lon"] - a["lon"]) * coslat
        dy = (b["lat"] - a["lat"])
        return math.hypot(dx, dy) * EARTH_KM_PER_DEG

    def _intersect(self, path: List[Dict[str, Any]], fires: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        hits = []
        for f in fires:
            best_km = None
            best_hours_ago = None
            for i in range(1, len(path)):
                a, b = path[i - 1], path[i]
                d = _point_to_segment_km(f["lat"], f["lon"], a["lat"], a["lon"], b["lat"], b["lon"])
                if best_km is None or d < best_km:
                    best_km = d
                    best_hours_ago = b["hours_ago"]
            if best_km is not None and best_km <= CORRIDOR_WIDTH_DEG * EARTH_KM_PER_DEG:
                hits.append({
                    "lat": f["lat"], "lon": f["lon"],
                    "district": f.get("district"),
                    "frp": f.get("frp"),
                    "distance_km": round(best_km, 1),
                    "hours_ago": best_hours_ago,
                })
        hits.sort(key=lambda x: x["hours_ago"])
        return hits

    def _summary(self, intersections: List[Dict[str, Any]], path: List[Dict[str, Any]]) -> str:
        if not intersections:
            return "No active fire detections intersected this air mass's back-trajectory."
        n = len(intersections)
        districts = sorted({h["district"] for h in intersections if h.get("district")})
        earliest = max(h["hours_ago"] for h in intersections)
        dtxt = ", ".join(districts[:4]) + (" and others" if len(districts) > 4 else "")
        return (
            f"This air mass passed over {n} active fire detection{'s' if n != 1 else ''} "
            f"({dtxt}) within the last {earliest}h before reaching the station."
        )


trajectory_service = TrajectoryService()
