"""Official Government of India CPCB feed adapter (data.gov.in).

Ingests the real-time CAAQMS resource published on data.gov.in — the same
national feed CPCB's own SAMEER app draws on, covering 500+ monitoring stations
across India. This is the live proof of the scalability claim: the platform
already speaks the official government data format, so onboarding a new city is
a config entry, not an integration project.

Additive and defensive: every call has a timeout + graceful fallback, and the
platform runs perfectly with this feed unreachable (curated stations + simulator
remain the baseline). Uses data.gov.in's public sample key by default.

Resource: 3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69 (Real time Air Quality Index).
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from backend.config import settings

RESOURCE_ID = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
BASE_URL = f"https://api.data.gov.in/resource/{RESOURCE_ID}"


def _to_float(v: Any) -> Optional[float]:
    try:
        if v in (None, "NA", "", "-"):
            return None
        return float(v)
    except (ValueError, TypeError):
        return None


class GovFeedService:
    def __init__(self):
        self._last_ok: Optional[datetime] = None

    async def fetch_records(self, limit: int = 100, city: Optional[str] = None,
                            state: Optional[str] = None) -> Dict[str, Any]:
        """Fetch live CAAQMS records from data.gov.in. Returns a status envelope
        so the UI can honestly show reachability without ever crashing."""
        params = {
            "api-key": settings.DATA_GOV_IN_API_KEY,
            "format": "json",
            "limit": limit,
        }
        # data.gov.in supports server-side field filters
        if city:
            params["filters[city]"] = city
        if state:
            params["filters[state]"] = state

        # The gov server can be slow to stream; a generous read timeout + an
        # explicit User-Agent avoid spurious ReadTimeouts (httpx defaults are
        # tighter than curl's).
        headers = {"User-Agent": "VayuDrishti/1.0 (air-quality-intelligence)"}
        try:
            async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
                resp = await client.get(BASE_URL, params=params)
            if resp.status_code != 200:
                return {"available": False, "reason": f"HTTP {resp.status_code}",
                        "source": "data.gov.in", "resource_id": RESOURCE_ID}
            body = resp.json()
            records = self._normalize(body.get("records", []))
            self._last_ok = datetime.utcnow()
            return {
                "available": True,
                "source": "data.gov.in (CPCB CAAQMS, Government of India)",
                "resource_id": RESOURCE_ID,
                "total_available": body.get("total"),
                "fetched": len(records),
                "records": records,
                "fetched_at": self._last_ok,
                "license": "Government Open Data License - India (data.gov.in)",
            }
        except Exception as e:
            # str(ReadTimeout) is empty; fall back to the exception class name so
            # the reason is never blank in the UI.
            reason = str(e) or type(e).__name__
            return {"available": False, "reason": reason,
                    "source": "data.gov.in", "resource_id": RESOURCE_ID}

    def _normalize(self, raw: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Fold the feed's long (per-pollutant) rows into one record per station,
        mapped to our reading shape."""
        by_station: Dict[str, Dict[str, Any]] = {}
        pollutant_key = {
            "PM2.5": "pm25", "PM10": "pm10", "NO2": "no2", "SO2": "so2",
            "OZONE": "o3", "CO": "co", "NH3": "nh3",
        }
        for r in raw:
            station = r.get("station") or r.get("station_name") or "Unknown"
            key = f"{r.get('city','?')}|{station}"
            entry = by_station.setdefault(key, {
                "station": station,
                "city": r.get("city"),
                "state": r.get("state"),
                "latitude": _to_float(r.get("latitude")),
                "longitude": _to_float(r.get("longitude")),
                "last_update": r.get("last_update"),
                "pollutants": {},
                "source": "data.gov.in",
            })
            pol = (r.get("pollutant_id") or r.get("pollutant") or "").upper()
            val = _to_float(r.get("pollutant_avg") or r.get("avg_value") or r.get("pollutant_max"))
            if pol in pollutant_key and val is not None:
                entry["pollutants"][pollutant_key[pol]] = val
        return list(by_station.values())

    async def coverage_summary(self) -> Dict[str, Any]:
        """Lightweight scalability headline: how many stations/cities/states the
        official feed exposes right now."""
        result = await self.fetch_records(limit=500)
        if not result.get("available"):
            return {
                "available": False, "reason": result.get("reason"),
                "source": result.get("source"),
                # The documented scale, shown even when the live call is blocked,
                # clearly labelled as the published figure rather than a live count.
                "published_scale": "500+ CAAQMS stations across 300+ Indian cities (CPCB)",
            }
        records = result["records"]
        cities = sorted({r["city"] for r in records if r.get("city")})
        states = sorted({r["state"] for r in records if r.get("state")})
        return {
            "available": True,
            "source": result["source"],
            "total_available": result.get("total_available"),
            "stations_fetched": len(records),
            "distinct_cities": len(cities),
            "distinct_states": len(states),
            "sample_cities": cities[:12],
            "fetched_at": result["fetched_at"],
            "license": result["license"],
        }


gov_feed_service = GovFeedService()
