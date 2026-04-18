from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.agent import AgentProfileCreate, AgentProfileRead
from app.services.agent_service import create_agent, list_agents

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=list[AgentProfileRead])
def get_agents() -> list[AgentProfileRead]:
    return list_agents(get_settings().database_path)


@router.post("", response_model=AgentProfileRead, status_code=201)
def post_agent(payload: AgentProfileCreate) -> AgentProfileRead:
    return create_agent(get_settings().database_path, payload)
