"""
Genuine tool-calling multi-agent orchestration layer.

Previously, "AI" in this codebase meant a single hand-written prompt string sent
straight to the Gemini SDK and parsed as JSON - no tool use, no orchestration, and no
LangChain despite it being listed as a dependency and described in the README/pitch.

This module implements real agents: an LLM bound to a set of tools that it decides
whether and how to call, in a loop, before producing a final answer. Two agents are
built on top of the same primitives:

  - EnforcementCompoundRiskAgent: given a single rule-detected pollutant breach, it
    independently pulls source-attribution and forecast-trend data (tools) to decide
    whether this is an isolated sensor blip or a genuine COMPOUND risk (the exact
    "co-occurrence of signals no single sensor would flag" scenario the problem
    statement asks for), and cites regulatory context for its recommendation.

  - CitizenAdvisoryAgent: given current AQI conditions, it looks up nearby vulnerable
    locations (schools/hospitals/outdoor-worker zones) itself via a tool instead of
    having them force-fed, and can call out specific at-risk locations by name.

Both agents degrade to the existing deterministic/template logic if GEMINI_API_KEY is
absent or any step fails - preserving the resilience the rest of the app already has.
"""
import asyncio
import json
from typing import Any, Dict, List, Optional

from backend.config import settings

_AGENTS_AVAILABLE = False
_llm = None
try:
    from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage, AIMessage
    from langchain_core.tools import tool
    from langchain_groq import ChatGroq
    _AGENTS_AVAILABLE = True
except Exception as e:  # pragma: no cover - environment without langchain installed
    print(f"[agents] LangChain/Groq agent stack unavailable ({e}). Agentic features disabled.")


def _get_llm(temperature: float = 0.3):
    global _llm
    if _llm is None and _AGENTS_AVAILABLE and settings.GROQ_API_KEY:
        _llm = ChatGroq(
            model="openai/gpt-oss-120b",
            groq_api_key=settings.GROQ_API_KEY,
            temperature=temperature,
        )
    return _llm


if _AGENTS_AVAILABLE:

    @tool
    async def lookup_source_attribution(city: str, zone: str) -> str:
        """Look up estimated pollution source attribution (vehicular/industrial/construction/
        biomass_burning percentages) and supporting evidence (traffic congestion, nearby
        industries, construction sites, fire hotspots, wind) for a city + zone."""
        from backend.services.attribution import attribution_service
        result = await attribution_service.get_attribution_for_zone(city, zone)
        return json.dumps({
            "attributions": result["attributions"],
            "evidence": result["evidence"],
        })

    @tool
    async def lookup_forecast_trend(station_id: str) -> str:
        """Look up the next-24-hour AQI forecast trend for a monitoring station id, to
        determine whether conditions at that station are worsening, improving, or stable."""
        from backend.services.prediction import prediction_service
        result = await prediction_service.get_forecast_for_station(station_id, hours=24)
        preds = result["predictions"]
        next_6h = preds[:6]
        next_24h = preds[:24]
        return json.dumps({
            "next_6h_avg_aqi": round(sum(p["aqi"] for p in next_6h) / len(next_6h), 1),
            "next_24h_avg_aqi": round(sum(p["aqi"] for p in next_24h) / len(next_24h), 1),
            "peak_aqi_next_24h": max(p["aqi"] for p in next_24h),
            "trend": "worsening" if next_6h[-1]["aqi"] > next_6h[0]["aqi"] else "improving_or_stable",
        })

    @tool
    async def lookup_regulatory_context(question: str) -> str:
        """Search CPCB/NAAQS/NCAP regulatory documents for guidance relevant to an air
        quality compliance, enforcement, or health-advisory question. Returns short
        cited excerpts."""
        from backend.services.rag import rag_service
        results = rag_service.query(question, top_k=3)
        return json.dumps(results) if results else json.dumps([])

    @tool
    async def lookup_vulnerable_locations(city: str) -> str:
        """Look up nearby hospitals, schools, and outdoor-worker/construction zones in a
        city that are most at risk from air pollution, with coordinates."""
        from backend.services.advisory import advisory_service
        locations = await advisory_service.get_vulnerability_map_data(city)
        return json.dumps(locations)

    ENFORCEMENT_TOOLS = [lookup_source_attribution, lookup_forecast_trend, lookup_regulatory_context]
    ADVISORY_TOOLS = [lookup_vulnerable_locations]


async def _run_tool_calling_agent(
    system_prompt: str,
    user_prompt: str,
    tools: List[Any],
    max_steps: int = 4,
    temperature: float = 0.3,
) -> Optional[str]:
    """
    A minimal, version-stable ReAct-style tool-calling loop built directly on
    langchain-core primitives (bind_tools + message types), rather than the
    higher-level `langchain.agents` API surface, which has changed shape across
    LangChain's 0.2 -> 0.3 -> 1.0 releases. The loop itself IS the agent: the model
    decides which tool(s) to call and in what order, observes results, and may call
    further tools before answering - genuine multi-step tool orchestration.

    Includes 429/503 retry with exponential backoff so free-tier quota bursts
    (5 req/min) don't propagate as errors to the caller.
    """
    llm = _get_llm(temperature=temperature)
    if llm is None:
        return None

    bound_llm = llm.bind_tools(tools)
    tools_by_name = {t.name: t for t in tools}
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]

    async def _invoke_with_retry(msgs, max_retries=3):
        """Invoke LLM with exponential backoff on 429/503."""
        delay = 20.0
        for attempt in range(max_retries + 1):
            try:
                return await bound_llm.ainvoke(msgs)
            except Exception as e:
                err_str = str(e)
                is_rate_limit = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str
                is_unavailable = "503" in err_str or "UNAVAILABLE" in err_str
                if (is_rate_limit or is_unavailable) and attempt < max_retries:
                    wait = min(delay * (2 ** attempt), 60.0)
                    print(f"[agents] Gemini {429 if is_rate_limit else 503} — retrying in {wait:.0f}s (attempt {attempt+1}/{max_retries})")
                    await asyncio.sleep(wait)
                else:
                    raise

    for _ in range(max_steps):
        ai_msg = await _invoke_with_retry(messages)
        messages.append(ai_msg)

        tool_calls = getattr(ai_msg, "tool_calls", None)
        if not tool_calls:
            return _message_text(ai_msg.content)

        for tc in tool_calls:
            tool_fn = tools_by_name.get(tc["name"])
            if tool_fn is None:
                tool_result = f"Error: unknown tool '{tc['name']}'"
            else:
                try:
                    tool_result = await tool_fn.ainvoke(tc["args"])
                except Exception as e:
                    tool_result = f"Tool error: {e}"
            messages.append(ToolMessage(content=str(tool_result), tool_call_id=tc["id"]))

    # Ran out of steps without a final answer - force one final response.
    messages.append(HumanMessage(content="Give your final answer now, based on everything gathered so far."))
    final = await _invoke_with_retry(messages)
    return _message_text(final.content)


def _message_text(content: Any) -> str:
    """
    Newer langchain-google-genai versions return AIMessage.content as a list of
    content blocks (e.g. [{"type": "text", "text": "...", "extras": {...}}]) rather
    than a plain string. Normalize both shapes to a single string.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and "text" in block:
                parts.append(block["text"])
        return "".join(parts)
    return str(content) if content is not None else ""


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    text = _message_text(text).strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        # Try to salvage a JSON object embedded in surrounding prose
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except Exception:
                return None
        return None


async def analyze_enforcement_action(action: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Compound Risk Enforcement Intelligence Agent.

    Takes a single rule-detected pollutant breach (fast, deterministic, already
    computed by EnforcementService) and independently investigates it using tools -
    cross-referencing source attribution and the station's forecast trend - to judge
    whether it's an isolated blip or a genuine compound risk situation, and grounds
    its recommendation in regulatory context. Returns None if agents are unavailable
    (no Gemini key / import failure) so callers can fall back gracefully.
    """
    if not _AGENTS_AVAILABLE or not settings.GEMINI_API_KEY:
        return None

    evidence = action.get("evidence", {})
    system_prompt = """You are a Compound Risk Enforcement Intelligence Agent for Indian industrial \
and urban air quality enforcement, modeled on how OISD/DGMS/Factory Act inspectors reason about \
combined risk signals. A single elevated sensor reading is not automatically an emergency - your job \
is to determine whether this reading co-occurs with OTHER risk signals (a worsening forecast trend, \
a dominant matching pollution source, regulatory precedent) that make it a genuine compound risk \
deserving urgent enforcement, versus a transient, low-risk spike.

Use the available tools to check source attribution for the zone and the forecast trend for the \
station before concluding. Then respond with ONLY a JSON object of this exact shape (no markdown, no \
extra text):
{
  "compound_risk": true or false,
  "confidence": 0.0 to 1.0,
  "rationale": "2-3 sentences explaining what you found by cross-referencing attribution and forecast data",
  "regulatory_basis": "short reference to relevant CPCB/OISD/Factory Act guidance if found, else empty string",
  "recommended_escalation": "one specific, actionable next step"
}"""

    user_prompt = f"""Enforcement breach detected:
- City: {action.get('city')}
- Station/Zone: {evidence.get('station_id')} ({action.get('title')})
- Pollutant: {evidence.get('pollutant')}
- Current level: {evidence.get('current_level')} (threshold: {evidence.get('threshold')})
- Duration above threshold: {evidence.get('duration_hours')} hours
- Preliminary rule-based description: {action.get('description')}

Investigate whether this is a compound risk situation."""

    try:
        raw = await _run_tool_calling_agent(system_prompt, user_prompt, ENFORCEMENT_TOOLS, max_steps=4)
        if raw is None:
            return None
        parsed = _extract_json(raw)
        if not parsed:
            return None
        return parsed
    except Exception as e:
        print(f"[agents] Enforcement compound-risk agent failed: {e}")
        return None


async def generate_citizen_advisory_agentic(
    city: str, zone: str, aqi: float, category: str, pollutants: List[str]
) -> Optional[Dict[str, Any]]:
    """
    Citizen Advisory Agent. Unlike the previous raw single-shot prompt, this agent
    decides for itself whether to look up nearby vulnerable locations (schools,
    hospitals, outdoor-worker zones) via a tool, and can reference them by name in the
    generated guidance when conditions are severe enough to warrant it.
    """
    if not _AGENTS_AVAILABLE or not settings.GEMINI_API_KEY:
        return None

    system_prompt = """You are VayuDrishti's Citizen Advisory Agent for Indian cities. You generate \
concise, actionable, multi-language public health guidance from current air quality conditions.

If the AQI category is "Poor" or worse, use the lookup_vulnerable_locations tool to check for nearby \
hospitals, schools, or outdoor-worker zones so your advisory can be concretely localized (e.g. \
naming a specific nearby school) rather than generic. For "Good"/"Satisfactory"/"Moderate" conditions \
you do not need to call any tool.

Respond with ONLY a JSON object of this exact shape (no markdown, no extra text):
{
  "general": {"en": "...", "hi": "...", "ta": "...", "kn": "...", "bn": "...", "te": "..."},
  "vulnerable": {"en": "...", "hi": "...", "ta": "...", "kn": "...", "bn": "...", "te": "..."},
  "outdoor_workers": {"en": "...", "hi": "...", "ta": "...", "kn": "...", "bn": "...", "te": "..."}
}
Each entry must be under 2 short sentences, specific and actionable, culturally relevant to India."""

    user_prompt = f"""Current conditions:
- City: {city}
- Zone: {zone}
- AQI: {aqi:.0f} ({category})
- Primary pollutants: {', '.join(pollutants)}

Generate the health advisories now."""

    try:
        raw = await _run_tool_calling_agent(system_prompt, user_prompt, ADVISORY_TOOLS, max_steps=3)
        if raw is None:
            return None
        parsed = _extract_json(raw)
        if not parsed:
            return None
        return parsed
    except Exception as e:
        print(f"[agents] Citizen advisory agent failed: {e}")
        return None
