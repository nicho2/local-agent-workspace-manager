from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.safety import SafetySummary
from app.services.safety_service import get_safety_summary

router = APIRouter(prefix="/safety", tags=["safety"])


@router.get("/summary", response_model=SafetySummary)
def get_summary() -> SafetySummary:
    return get_safety_summary(get_settings().database_path)
