from fastapi import APIRouter
from pydantic import BaseModel
from app.services.llm_service import assistant

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    context: str = ""

@router.post("/chat")
def chat_with_ai(request: ChatRequest):
    response = assistant.generate_response(request.query, request.context)
    return {"reply": response}
