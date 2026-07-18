from fastapi import APIRouter, HTTPException, Query, Body
from backend.services.enforcement import enforcement_service
from backend.services.replay import parse_at

router = APIRouter(prefix="/enforcement", tags=["enforcement"])

@router.get("/actions")
async def get_actions(city: str, at: str = Query(default=None)):
    """
    Get prioritized, evidence-backed enforcement action recommendations for a city.
    With `at`, actions are recomputed as of that historical timestamp (replay mode).
    """
    try:
        actions = await enforcement_service.get_actions_by_city(city.lower(), at=parse_at(at))
        return actions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/actions/{action_id}")
async def get_action(action_id: str):
    """
    Get a single enforcement action details with full evidence package.
    """
    action = await enforcement_service.get_action_by_id(action_id)
    if not action:
        raise HTTPException(status_code=404, detail=f"Enforcement action {action_id} not found.")
    return action

@router.post("/actions/{action_id}/analyze")
async def analyze_action(action_id: str):
    """
    Run the Compound Risk Enforcement Intelligence Agent against a rule-detected
    breach. The agent uses tools to independently check source attribution and the
    station's forecast trend before judging whether this is a genuine compound risk
    situation, grounding its recommendation in regulatory context where possible.
    """
    try:
        result = await enforcement_service.get_ai_analysis(action_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/actions/{action_id}")
async def update_action(action_id: str, status: str = Query(..., description="Action status: pending, assigned, resolved")):
    """
    Update status of an enforcement action (e.g. mark it as assigned or resolved).
    """
    updated = await enforcement_service.update_action_status(action_id, status)
    if not updated:
        raise HTTPException(status_code=400, detail="Action status update failed. Check the action ID or status.")
    return {"status": "success", "message": f"Action status updated to {status}"}
