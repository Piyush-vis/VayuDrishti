from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.rag import generate_rag_response

router = APIRouter(prefix="/chat", tags=["chat"])

class QueryModel(BaseModel):
    question: str

@router.post("/query")
async def chat_query(query: QueryModel):
    """
    Query the CPCB regulatory document database (NAAQS, NCAP guidelines, calculation rules) using RAG.
    """
    try:
        if not query.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")
            
        response = await generate_rag_response(query.question)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
