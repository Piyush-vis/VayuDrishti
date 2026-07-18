from fastapi import APIRouter, HTTPException

from backend.services.replay import replay_service

router = APIRouter(prefix="/replay", tags=["replay"])


@router.get("/episodes")
async def list_episodes():
    """List available historical replay episodes (scenario switcher data)."""
    return replay_service.list_episodes()


@router.get("/episodes/{episode_id}")
async def get_episode(episode_id: str):
    """Full episode detail including the AQI envelope and archived fire points."""
    ep = replay_service.get_episode(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail=f"Unknown episode: {episode_id}")
    return ep


@router.post("/episodes/{episode_id}/seed")
async def seed_episode(episode_id: str, force: bool = False):
    """Idempotently materialise the episode's hourly readings into the database.

    `force=true` regenerates every reading (needed after calibration changes,
    since episode data persists in MongoDB across restarts).
    """
    try:
        inserted = await replay_service.ensure_episode_seeded(episode_id, force=force)
        return {"episode_id": episode_id, "inserted": inserted, "status": "ready"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
