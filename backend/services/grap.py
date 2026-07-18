"""Forecast-triggered GRAP (Graded Response Action Plan) automation engine.

CAQM's own policy states GRAP stages "shall be invoked in advance" based on
forecasts — yet 13 of 17 invocations in winter 2025-26 were reactive
(ThePrint/CEEW). This engine automates the policy as written: it watches the
city AQI trajectory, projects it forward with two fully transparent signals,
and auto-drafts a CAQM-style invocation order with the real statutory action
checklist the moment a stage threshold is projected to be crossed and
sustained.

Trigger signals (the order records WHICH one fired — nothing is a black box):
  - observed:        the current city index has already crossed a threshold
  - model_forecast:  the XGBoost recursive forecast crosses + sustains it
  - trend_projection: persistence-with-trend (OLS slope over the trailing 24h
    city mean, projected forward) crosses + sustains it. This is a standard
    forecasting baseline, documented as such.

Stages and action lists follow the official CAQM revised GRAP schedule
(Dec 2024, caqm.nic.in). GRAP legally applies to Delhi-NCR; for other cities
the same engine runs as a "graded response recommendation" modeled on GRAP,
and is labelled accordingly.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from backend.models.database import db_helper
from backend.services.prediction import prediction_service

# Official CAQM stage thresholds (city-average AQI)
GRAP_STAGES = [
    {"stage": 1, "name": "Stage I — Poor", "band": "AQI 201-300", "min_aqi": 201},
    {"stage": 2, "name": "Stage II — Very Poor", "band": "AQI 301-400", "min_aqi": 301},
    {"stage": 3, "name": "Stage III — Severe", "band": "AQI 401-450", "min_aqi": 401},
    {"stage": 4, "name": "Stage IV — Severe+", "band": "AQI >450", "min_aqi": 451},
]

# Real statutory actions per stage (condensed from the CAQM revised schedule,
# Dec 2024). Actions are cumulative: Stage III includes Stages I-II, etc.
GRAP_ACTIONS: Dict[int, List[Dict[str, str]]] = {
    1: [
        {"action": "Enforce dust mitigation at construction & demolition sites (anti-smog guns, screens, covered storage)", "agency": "DPCC / Municipal Corporation", "signal": "construction"},
        {"action": "Mechanized sweeping and water sprinkling on arterial roads", "agency": "Municipal Corporation / PWD", "signal": "dust"},
        {"action": "Strict PUC certificate enforcement; penalize visibly polluting vehicles", "agency": "Transport Dept / Traffic Police", "signal": "vehicular"},
        {"action": "Zero tolerance for open burning of waste and biomass; landfill fire patrols", "agency": "Municipal Corporation", "signal": "biomass"},
        {"action": "Ban coal/firewood use in eateries; enforce LPG/electric alternatives", "agency": "Municipal Corporation", "signal": "industrial"},
        {"action": "Regulate diesel generator sets per the GRAP schedule", "agency": "DISCOMs / State PCB", "signal": "industrial"},
    ],
    2: [
        {"action": "Raise parking fees to discourage private vehicle use", "agency": "Municipal Corporation / NDMC", "signal": "vehicular"},
        {"action": "Augment CNG/electric bus fleet and metro service frequency", "agency": "DTC / DMRC / Transport Undertaking", "signal": "vehicular"},
        {"action": "Targeted dust suppression on identified hotspot road stretches", "agency": "PWD", "signal": "dust"},
        {"action": "Restrict diesel generator use except for emergency services", "agency": "State PCB", "signal": "industrial"},
        {"action": "Water sprinkling with dust suppressants on roads every alternate day", "agency": "Municipal Corporation", "signal": "dust"},
    ],
    3: [
        {"action": "Ban BS-III petrol and BS-IV diesel light motor vehicles", "agency": "Transport Dept / Traffic Police", "signal": "vehicular"},
        {"action": "Halt non-essential construction and demolition activity", "agency": "DDA / Municipal Corporation / DPCC", "signal": "construction"},
        {"action": "Close stone crushers and suspend mining activities", "agency": "State PCBs", "signal": "dust"},
        {"action": "Shift classes up to Grade V to hybrid mode", "agency": "Education Dept", "signal": "health"},
        {"action": "Stagger timings of public offices and municipal bodies", "agency": "State Govt / Central Govt", "signal": "vehicular"},
        {"action": "Bar inter-state buses (except EV/CNG/BS-VI diesel) from entering NCR", "agency": "Transport Dept", "signal": "vehicular"},
    ],
    4: [
        {"action": "Ban entry of non-essential trucks (except LNG/CNG/EV/BS-VI diesel)", "agency": "Traffic Police / Transport Dept", "signal": "vehicular"},
        {"action": "Total ban on construction & demolition, including linear public projects", "agency": "All agencies", "signal": "construction"},
        {"action": "Shift classes VI-IX and XI to hybrid/online mode", "agency": "Education Dept", "signal": "health"},
        {"action": "50% work-from-home for government and private offices", "agency": "State Govt / DoPT", "signal": "health"},
        {"action": "Ban Delhi-registered BS-IV and below diesel MGVs/HGVs except essential services", "agency": "Transport Dept", "signal": "vehicular"},
        {"action": "Consider closure of non-emergency industrial operations on unapproved fuels", "agency": "State PCB / CAQM", "signal": "industrial"},
    ],
}

CITATION = "CAQM revised GRAP schedule, Dec 2024 (caqm.nic.in); CAQM policy mandates advance invocation on forecasts"

# GRAP is a statutory CAQM instrument for Delhi-NCR only; elsewhere the same
# engine runs in advisory mode and says so.
NCR_CITIES = {"delhi"}

SUSTAIN_HOURS = 3  # a crossing must hold this many consecutive hours to trigger


def stage_for_aqi(aqi: float) -> int:
    """Official CAQM stage for a city-average AQI (0 = no stage)."""
    stage = 0
    for s in GRAP_STAGES:
        if aqi >= s["min_aqi"]:
            stage = s["stage"]
    return stage


def find_sustained_crossing(series: List[float], threshold: float, sustain: int = SUSTAIN_HOURS) -> Optional[int]:
    """Earliest 1-based hour where the series crosses `threshold` and stays
    there for `sustain` consecutive hours. None if never sustained."""
    run = 0
    for i, v in enumerate(series):
        if v >= threshold:
            run += 1
            if run >= sustain:
                return i - sustain + 2  # first hour of the sustained run (1-based)
        else:
            run = 0
    return None


def ols_slope(values: List[float]) -> float:
    """Least-squares slope (per hour) of an hourly series."""
    n = len(values)
    if n < 2:
        return 0.0
    xs = range(n)
    mean_x = (n - 1) / 2.0
    mean_y = sum(values) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values))
    den = sum((x - mean_x) ** 2 for x in xs)
    return num / den if den else 0.0


class GRAPService:
    async def _city_stations(self, city: str) -> List[Dict[str, Any]]:
        cursor = db_helper.stations.find({"city": city, "active": True})
        return await cursor.to_list(length=100)

    async def _city_mean_series(self, city: str, start: datetime, end: datetime) -> List[Dict[str, Any]]:
        """Hourly city-mean AQI between start and end (inclusive), chronological."""
        stations = await self._city_stations(city)
        ids = [s["station_id"] for s in stations]
        cursor = db_helper.aqi_readings.find({
            "station_id": {"$in": ids},
            "timestamp": {"$gte": start, "$lte": end},
        }).sort("timestamp", 1)
        readings = await cursor.to_list(length=6000)
        by_hour: Dict[datetime, List[float]] = {}
        for r in readings:
            by_hour.setdefault(r["timestamp"], []).append(r["aqi"])
        return [
            {"timestamp": ts, "aqi": sum(v) / len(v)}
            for ts, v in sorted(by_hour.items())
        ]

    async def evaluate_city(self, city: str, at: Optional[datetime] = None, horizon: int = 48) -> Dict[str, Any]:
        """Full GRAP evaluation: current stage, projected stage, trigger signal,
        lead time, and an auto-drafted invocation order when escalation is due."""
        replay_mode = at is not None
        now = (at or datetime.utcnow()).replace(minute=0, second=0, microsecond=0)
        is_ncr = city in NCR_CITIES

        # ---- observed city index ----
        trailing = await self._city_mean_series(city, now - timedelta(hours=24), now)
        current_index = round(trailing[-1]["aqi"], 0) if trailing else None
        current_stage = stage_for_aqi(current_index) if current_index is not None else 0

        # ---- signal 1: ML model forecast (city mean of per-station forecasts) ----
        model_series: List[float] = []
        model_available = False
        try:
            stations = await self._city_stations(city)
            per_hour: List[List[float]] = [[] for _ in range(horizon)]
            for s in stations:
                fc = await prediction_service.get_forecast_for_station(
                    s["station_id"], hours=horizon, at=now if replay_mode else None
                )
                for i, p in enumerate(fc["predictions"][:horizon]):
                    per_hour[i].append(p["aqi"])
            model_series = [sum(v) / len(v) for v in per_hour if v]
            model_available = bool(model_series)
        except Exception as e:
            print(f"GRAP: model signal unavailable for {city}: {e}")

        # ---- signal 2: persistence-with-trend projection ----
        # Linear extrapolation is only credible short-range: the trend signal
        # projects at most 24h ahead; beyond that only the ML forecast counts.
        trend_series: List[float] = []
        slope = 0.0
        if len(trailing) >= 8 and current_index is not None:
            slope = ols_slope([p["aqi"] for p in trailing])
            trend_series = [
                max(0.0, min(650.0, current_index + slope * h))
                for h in range(1, min(horizon, 24) + 1)
            ]

        # ---- earliest sustained crossing per stage, per signal ----
        projected_stage = current_stage
        crossing_eta_hours: Optional[int] = None
        triggered_by: Optional[str] = None
        for s in reversed(GRAP_STAGES):  # highest stage first
            if s["stage"] <= current_stage:
                break
            candidates = []
            if model_available:
                h = find_sustained_crossing(model_series, s["min_aqi"])
                if h is not None:
                    candidates.append((h, "model_forecast"))
            if trend_series:
                h = find_sustained_crossing(trend_series, s["min_aqi"])
                if h is not None:
                    candidates.append((h, "trend_projection"))
            if candidates:
                h, signal = min(candidates)
                projected_stage = s["stage"]
                crossing_eta_hours = h
                triggered_by = signal
                break

        if current_stage > 0 and projected_stage <= current_stage:
            triggered_by = triggered_by or "observed"

        # ---- recommendation ----
        if projected_stage > current_stage:
            recommendation = "INVOKE_IN_ADVANCE"
            rationale = (
                f"{'Model forecast' if triggered_by == 'model_forecast' else 'Trend projection'} "
                f"shows the city index crossing {GRAP_STAGES[projected_stage-1]['min_aqi']} "
                f"in ~{crossing_eta_hours}h and sustaining it for {SUSTAIN_HOURS}+ hours. "
                f"CAQM policy requires invocation IN ADVANCE of the crossing — draft order attached."
            )
        elif current_stage > 0:
            recommendation = "MAINTAIN"
            rationale = (
                f"City index {current_index} is inside {GRAP_STAGES[current_stage-1]['band']}. "
                f"Keep {GRAP_STAGES[current_stage-1]['name']} actions in force."
            )
        else:
            recommendation = "NO_ACTION"
            rationale = f"City index {current_index} is below the Stage I threshold (201)."

        # ---- draft invocation order ----
        draft_order = None
        order_stage = projected_stage if recommendation == "INVOKE_IN_ADVANCE" else current_stage
        if order_stage > 0:
            actions: List[Dict[str, str]] = []
            for st in range(1, order_stage + 1):
                for a in GRAP_ACTIONS[st]:
                    actions.append({**a, "stage": st})
            eta = now + timedelta(hours=crossing_eta_hours) if crossing_eta_hours else now
            draft_order = {
                "order_id": f"VD-GRAP-{city.upper()}-{now.strftime('%Y%m%d%H')}-S{order_stage}",
                "authority": "CAQM (draft prepared by VayuDrishti)" if is_ncr
                             else "State Pollution Control Board (GRAP-modeled advisory)",
                "legal_basis": "CAQM Act 2021 + revised GRAP schedule" if is_ncr
                               else "Advisory modeled on CAQM GRAP; non-statutory outside NCR",
                "city": city,
                "stage": order_stage,
                "stage_name": GRAP_STAGES[order_stage - 1]["name"],
                "issued_at": now,
                "effective_from": now if recommendation != "INVOKE_IN_ADVANCE" else eta - timedelta(hours=min(12, crossing_eta_hours or 0)),
                "basis": {
                    "current_city_index": current_index,
                    "threshold": GRAP_STAGES[order_stage - 1]["min_aqi"],
                    "triggered_by": triggered_by or "observed",
                    "projected_crossing_at": eta if recommendation == "INVOKE_IN_ADVANCE" else None,
                    "sustain_rule_hours": SUSTAIN_HOURS,
                },
                "actions": actions,
                "citation": CITATION,
            }

        # Lead time: hours between our draft and the projected threshold crossing.
        # The pitch comparison: winter 2025-26 invocations came AFTER crossings
        # (13/17 reactive, cited) — ours is drafted before.
        lead_time_hours = crossing_eta_hours if recommendation == "INVOKE_IN_ADVANCE" else 0

        return {
            "city": city,
            "evaluated_at": now,
            "provenance": "replay" if replay_mode else "live",
            "is_ncr_statutory": is_ncr,
            "city_index": {"current": current_index, "stations": len(await self._city_stations(city))},
            "current_stage": current_stage,
            "projected_stage": projected_stage,
            "recommendation": recommendation,
            "rationale": rationale,
            "triggered_by": triggered_by,
            "crossing_eta_hours": crossing_eta_hours,
            "lead_time_hours": lead_time_hours,
            "signals": {
                "observed": {"city_index": current_index, "stage": current_stage},
                "model_forecast": {
                    "available": model_available,
                    "max": round(max(model_series), 0) if model_series else None,
                },
                "trend_projection": {
                    "available": bool(trend_series),
                    "slope_aqi_per_hour": round(slope, 2),
                    "max": round(max(trend_series), 0) if trend_series else None,
                },
            },
            "projection_series": [
                {
                    "hour": i + 1,
                    "model": round(model_series[i], 0) if i < len(model_series) else None,
                    "trend": round(trend_series[i], 0) if i < len(trend_series) else None,
                }
                for i in range(min(horizon, max(len(model_series), len(trend_series))))
            ],
            "draft_order": draft_order,
            "stage_schedule": GRAP_STAGES,
            "method_note": (
                "Trigger = earliest sustained crossing (>=3h) of a stage threshold by either "
                "the XGBoost recursive forecast or a persistence-with-trend projection "
                "(OLS slope over trailing 24h city mean, projected max 24h ahead). "
                "The order records which signal fired. " + CITATION
            ),
        }


grap_service = GRAPService()
