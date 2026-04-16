from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_user, CurrentUser
from app.middleware.exception_middleware import AppException
from app.services.ai_client import AIClient

router = APIRouter(prefix="/admin/ai", tags=["admin-ai"])


@router.get("/check")
async def check_ai_connectivity(user: CurrentUser = Depends(get_current_user)):
    if user.role != "admin":
        raise AppException("FORBIDDEN", "Admin access required", 403)

    client = AIClient()
    gemini = await client.check_gemini()
    ollama = await client.check_ollama()

    return {
        "success": True,
        "data": {"gemini": gemini, "ollama": ollama},
        "message": "AI connectivity check complete",
    }
