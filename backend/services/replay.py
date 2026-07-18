"""Historical episode replay service.

Loads episode definitions from backend/data/episodes/*.json and materialises
deterministic hourly readings into the aqi_readings collection (timestamps live
in the episode's own historical range, so they never collide with live data —
the (station_id, timestamp) upsert key keeps this idempotent).

Every service accepts an `at` timestamp; when `at` falls inside an episode the
whole platform — map, forecasts, attribution, GRAP, enforcement, advisories —
operates as of that historical moment. Readings carry
source="replay:<episode_id>" so the UI provenance badges label them honestly.
"""

import json
import math
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from backend.models.database import db_helper
from backend.services.data_ingestion import (
    calculate_indian_aqi,
    sub_index_to_concentration,
)

EPISODES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "episodes")


def parse_at(at: Optional[str]) -> Optional[datetime]:
    """Parse an `at` query param into a naive-UTC datetime (DB convention).

    All stored timestamps are naive UTC; a tz-aware input would raise on
    comparison, so tzinfo is stripped after parsing.
    """
    if not at:
        return None
    dt = datetime.fromisoformat(at.replace("Z", "+00:00"))
    return dt.replace(tzinfo=None)


def _iso(value: str) -> datetime:
    return datetime.fromisoformat(value)


class ReplayService:
    def __init__(self):
        self._episodes: Optional[Dict[str, Dict[str, Any]]] = None
        self._seeded: set = set()

    def _load(self) -> Dict[str, Dict[str, Any]]:
        if self._episodes is None:
            self._episodes = {}
            if os.path.isdir(EPISODES_DIR):
                for fname in sorted(os.listdir(EPISODES_DIR)):
                    if fname.endswith(".json"):
                        with open(os.path.join(EPISODES_DIR, fname), encoding="utf-8") as f:
                            ep = json.load(f)
                        self._episodes[ep["episode_id"]] = ep
        return self._episodes

    def list_episodes(self) -> List[Dict[str, Any]]:
        """Episode metadata for the UI scenario switcher (heavy arrays omitted)."""
        out = []
        for ep in self._load().values():
            out.append({
                "episode_id": ep["episode_id"],
                "label": ep["label"],
                "description": ep["description"],
                "honesty_note": ep["honesty_note"],
                "start": ep["start"],
                "end": ep["end"],
                "default_at": ep["default_at"],
                "city": ep["city"],
                "anchors": ep["anchors"],
                "sources": ep["sources"],
            })
        return out

    def get_episode(self, episode_id: str) -> Optional[Dict[str, Any]]:
        return self._load().get(episode_id)

    def episode_covering(self, at: Optional[datetime]) -> Optional[Dict[str, Any]]:
        """The episode whose time range contains `at`, if any."""
        if at is None:
            return None
        for ep in self._load().values():
            if _iso(ep["start"]) <= at <= _iso(ep["end"]):
                return ep
        return None

    # ---- deterministic generation ----

    def _envelope(self, ep: Dict[str, Any], t: datetime) -> float:
        """Piecewise-linear city-mean AQI envelope through the control points."""
        points = ep["envelope_control_points"]
        if t <= _iso(points[0]["t"]):
            return float(points[0]["aqi"])
        for i in range(1, len(points)):
            t1 = _iso(points[i]["t"])
            if t <= t1:
                t0 = _iso(points[i - 1]["t"])
                a0, a1 = float(points[i - 1]["aqi"]), float(points[i]["aqi"])
                frac = (t - t0).total_seconds() / max(1.0, (t1 - t0).total_seconds())
                return a0 + (a1 - a0) * frac
        return float(points[-1]["aqi"])

    @staticmethod
    def _diurnal_multiplier(hour_ist: int) -> float:
        """Small deterministic diurnal modulation (morning/evening inversion peaks)."""
        if 7 <= hour_ist <= 10:
            return 1.05
        if 19 <= hour_ist <= 23:
            return 1.04
        if 13 <= hour_ist <= 16:
            return 0.95
        return 1.0

    def generate_reading(self, ep: Dict[str, Any], station: Dict[str, Any], t: datetime) -> Dict[str, Any]:
        """Deterministic calibrated reading for one station at one hour."""
        city = station["city"]
        station_id = station["station_id"]
        city_scale = ep["city_scales"].get(city, 0.3)
        station_factor = ep["station_factors"].get(station_id, 1.0)

        ist_hour = (t + timedelta(hours=5, minutes=30)).hour
        target_aqi = self._envelope(ep, t) * city_scale * station_factor * self._diurnal_multiplier(ist_hour)

        # Derive a consistent pollutant vector by inverting the CPCB sub-index
        # tables: PM2.5 is pinned as the dominant pollutant so
        # calculate_indian_aqi() reproduces the target AQI. Gas ratios follow the
        # observed chemistry of Delhi winter smog: particulate-driven, NO2
        # elevated but secondary, SO2 modest (~15-40 ug/m3), CO 2-4 mg/m3.
        pm25 = sub_index_to_concentration("pm25", target_aqi)
        pm10 = sub_index_to_concentration("pm10", target_aqi * 0.96)
        no2 = sub_index_to_concentration("no2", min(target_aqi * 0.30, 180.0))
        so2 = sub_index_to_concentration("so2", min(target_aqi * 0.06, 60.0))
        co = sub_index_to_concentration("co", min(target_aqi * 0.25, 140.0))
        o3 = 20.0  # winter smog episodes are low-ozone
        aqi = calculate_indian_aqi(pm25, pm10, no2, so2, o3, co)

        w = ep["weather"]
        # Daylight curve: 0 at night, 1 at solar noon (~14:00 IST)
        daylight = max(0.0, math.sin((ist_hour - 6) / 12.0 * math.pi)) if 6 <= ist_hour <= 18 else 0.0
        temp = w["night_temp_c"] + (w["day_temp_c"] - w["night_temp_c"]) * daylight
        humidity = w["night_humidity"] - (w["night_humidity"] - w["day_humidity"]) * daylight

        if t >= _iso(w["dispersal_start"]):
            wind_speed = w["dispersal_wind_speed_kmh"]
        else:
            # gentle deterministic wobble around the calm value
            wind_speed = w["calm_wind_speed_kmh"] + 1.5 * math.sin(t.hour / 24.0 * 2 * math.pi)
        wind_dir = int((w["wind_direction_deg"] + 8 * math.sin(t.hour / 24.0 * 2 * math.pi)) % 360)

        return {
            "station_id": station_id,
            "city": city,
            "timestamp": t,
            "aqi": aqi,
            "pm25": round(pm25, 1),
            "pm10": round(pm10, 1),
            "no2": round(no2, 1),
            "so2": round(so2, 1),
            "o3": round(o3, 1),
            "co": round(co, 2),
            "temperature": round(temp, 1),
            "humidity": round(humidity, 1),
            "wind_speed": round(max(0.5, wind_speed), 1),
            "wind_direction": wind_dir,
            "precipitation": 0.0,
            "source": f"replay:{ep['episode_id']}",
        }

    # ---- seeding ----

    async def ensure_episode_seeded(self, episode_id: str, force: bool = False) -> int:
        """Idempotently materialise the episode's hourly readings into the DB.

        `force=True` regenerates and upserts every reading even if the episode
        looks already seeded — required after generator/calibration changes,
        because episode data persists across restarts in real MongoDB.
        """
        ep = self.get_episode(episode_id)
        if not ep:
            raise ValueError(f"Unknown episode: {episode_id}")
        if episode_id in self._seeded and not force:
            return 0

        start, end = _iso(ep["start"]), _iso(ep["end"])

        cursor = db_helper.stations.find({"active": True})
        stations = await cursor.to_list(length=100)
        if not stations:
            return 0

        if not force:
            # Idempotence probe: if the final hour of the episode already exists
            # for the first station, assume the episode is fully seeded.
            probe = await db_helper.aqi_readings.find_one({
                "station_id": stations[0]["station_id"],
                "timestamp": {"$gte": end, "$lte": end},
            })
            if probe:
                self._seeded.add(episode_id)
                return 0

        total = 0
        for station in stations:
            batch = []
            t = start
            while t <= end:
                batch.append(self.generate_reading(ep, station, t))
                t += timedelta(hours=1)
            if force:
                # Existing rows must be overwritten, not skipped
                for r in batch:
                    try:
                        await db_helper.aqi_readings.update_one(
                            {"station_id": r["station_id"], "timestamp": r["timestamp"]},
                            {"$set": r},
                            upsert=True,
                        )
                        total += 1
                    except Exception:
                        pass
                continue
            try:
                await db_helper.aqi_readings.insert_many(batch)
                total += len(batch)
            except Exception:
                # Partial prior seed (duplicate keys on real Mongo) — fall back
                # to per-document upserts for this station only.
                for r in batch:
                    try:
                        await db_helper.aqi_readings.update_one(
                            {"station_id": r["station_id"], "timestamp": r["timestamp"]},
                            {"$set": r},
                            upsert=True,
                        )
                        total += 1
                    except Exception:
                        pass

        self._seeded.add(episode_id)
        print(f"Replay episode '{episode_id}' seeded: {total} readings.")
        return total

    # ---- covariate lookups for other services in replay mode ----

    def fire_count_near(self, lat: float, lon: float, at: datetime, radius_deg: float = 3.0) -> Optional[int]:
        """Archived fire detections near a point during an episode; None if `at`
        is outside every episode (caller falls back to its seasonal prior)."""
        ep = self.episode_covering(at)
        if not ep:
            return None
        pts = ep.get("fires", {}).get("points", [])
        return sum(
            1 for p in pts
            if abs(p["lat"] - lat) <= radius_deg and abs(p["lon"] - lon) <= radius_deg
        )

    def fire_points(self, at: datetime) -> List[Dict[str, Any]]:
        ep = self.episode_covering(at)
        if not ep:
            return []
        return ep.get("fires", {}).get("points", [])

    def transport_wind(self, at: datetime, hour_index: int = 0) -> Optional[Dict[str, Any]]:
        """Boundary-layer transport wind for back-trajectories during an episode.

        Distinct from the surface calm that drives the AQI spike — this is the
        elevated NW flow that advects stubble smoke into the basin. A small
        deterministic wobble makes the trajectory a gentle curve, not a ray.
        """
        ep = self.episode_covering(at)
        if not ep or "transport_wind" not in ep:
            return None
        tw = ep["transport_wind"]
        wobble = tw.get("direction_wobble_deg", 0.0) * math.sin(hour_index / 6.0)
        return {
            "wind_direction": (tw["from_direction_deg"] + wobble) % 360,
            "wind_speed": tw["speed_kmh"],
        }


replay_service = ReplayService()
