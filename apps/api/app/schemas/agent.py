from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas.common import ModelBase


class AgentRuntime(StrEnum):
    copilot_cli = "copilot_cli"
    codex = "codex"
    local_script = "local_script"
    custom = "custom"


class AgentProfileCreate(ModelBase):
    name: str = Field(min_length=3, max_length=120)
    runtime: AgentRuntime
    workspace_id: str | None = None
    command_template: str = Field(min_length=3)
    system_prompt: str | None = None
    environment: dict[str, str] = Field(default_factory=dict)
    is_active: bool = True


class AgentProfileRead(AgentProfileCreate):
    id: str
    created_at: datetime
    updated_at: datetime
