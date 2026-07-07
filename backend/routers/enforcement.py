from fastapi import APIRouter, HTTPException, Query, Body
from backend.services.enforcement import enforcement_service

router = APIRouter(prefix="/enforcement", tags=["enforcement"])

@router.get("/actions")
async def get_actions(city: str):
    """
    Get prioritized, evidence-backed enforcement action recommendations for a city.
    """
    try:
        actions = await enforcement_service.get_actions_by_city(city.lower())
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

@router.patch("/actions/{action_id}")
async def update_action(action_id: str, status: str = Query(..., description="Action status: pending, assigned, resolved")):
    """
    Update status of an enforcement action (e.g. mark it as assigned or resolved).
    """
    updated = await enforcement_service.update_action_status(action_id, status)
    if not updated:
        raise HTTPException(status_code=400, detail="Action status update failed. Check the action ID or status.")
    return {"status": "success", "message": f"Action status updated to {status}"}
