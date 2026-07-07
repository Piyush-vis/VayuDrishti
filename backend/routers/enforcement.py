from fastapi import APIRouter

router = APIRouter(prefix="/enforcement", tags=["enforcement"])

@router.get("/actions")
async def get_actions(city: str):
    return {"city": city, "message": "Priority-ranked enforcement actions"}

@router.get("/actions/{action_id}")
async def get_action(action_id: str):
    return {"action_id": action_id, "message": "Get single enforcement action details"}

@router.patch("/actions/{action_id}")
async def update_action(action_id: str, status: str):
    return {"action_id": action_id, "status": status, "message": "Update enforcement action status"}
