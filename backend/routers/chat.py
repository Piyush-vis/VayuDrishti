from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["chat"])

class QueryModel(BaseModel):
    question: str

@router.post("/query")
async def chat_query(query: QueryModel):
    return {"answer": f"Answer to query: {query.question}", "sources": []}
