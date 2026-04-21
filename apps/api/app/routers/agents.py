from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.common import DeleteSummary
from app.schemas.agent import (
    AgentProfileCreate,
    AgentProfileRead,
    AgentProfileUpdate,
    RuntimeCapabilityPreset,
)
from app.services.agent_service import create_agent, delete_agent, list_agents, update_agent
from app.services.runtime_preset_service import list_runtime_capability_presets

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=list[AgentProfileRead])
def get_agents() -> list[AgentProfileRead]:
    return list_agents(get_settings().database_path)


@router.post("", response_model=AgentProfileRead, status_code=201)
def post_agent(payload: AgentProfileCreate) -> AgentProfileRead:
    return create_agent(get_settings().database_path, payload)


@router.get("/runtime-presets", response_model=list[RuntimeCapabilityPreset])
def get_runtime_presets() -> list[RuntimeCapabilityPreset]:
    return list_runtime_capability_presets()


@router.put("/{agent_profile_id}", response_model=AgentProfileRead)
def put_agent(agent_profile_id: str, payload: AgentProfileUpdate) -> AgentProfileRead:
    return update_agent(get_settings().database_path, agent_profile_id, payload)


@router.delete("/{agent_profile_id}", response_model=DeleteSummary)
def delete_agent_by_id(agent_profile_id: str) -> DeleteSummary:
    return delete_agent(get_settings().database_path, agent_profile_id)
