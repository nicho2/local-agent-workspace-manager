from datetime import datetime
from enum import StrEnum
from typing import Self

from pydantic import Field, model_validator

from app.schemas.common import ModelBase


class AgentRuntime(StrEnum):
    copilot_cli = "copilot_cli"
    codex = "codex"
    local_command = "local_command"
    local_script = "local_script"
    custom = "custom"


class RuntimeCapabilityPreset(ModelBase):
    runtime: AgentRuntime
    display_name: str
    description: str
    default_command_template: str
    supports_dry_run: bool
    requires_write_access: bool
    requires_network_access: bool
    recommended_policy_prefixes: list[str]
    environment_defaults: dict[str, str] = Field(default_factory=dict)


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


class AgentProfileUpdate(ModelBase):
    name: str | None = Field(default=None, min_length=3, max_length=120)
    runtime: AgentRuntime | None = None
    workspace_id: str | None = None
    command_template: str | None = Field(default=None, min_length=3)
    system_prompt: str | None = None
    environment: dict[str, str] | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def reject_null_required_fields(self) -> Self:
        required_when_present = {
            "name",
            "runtime",
            "command_template",
            "environment",
            "is_active",
        }
        null_fields = [
            field
            for field in required_when_present
            if field in self.model_fields_set and getattr(self, field) is None
        ]
        if null_fields:
            raise ValueError(f"Fields cannot be null: {', '.join(sorted(null_fields))}")
        return self
