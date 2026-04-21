from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas.common import ModelBase


class RunTrigger(StrEnum):
    manual = "manual"
    schedule = "schedule"


class RunStatus(StrEnum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    blocked = "blocked"


class RunCreate(ModelBase):
    workspace_id: str
    agent_profile_id: str
    trigger: RunTrigger = RunTrigger.manual
    requested_by: str = Field(default="local-user", min_length=1)
    dry_run: bool = True
    command_override: str | None = None


class RunRead(ModelBase):
    id: str
    workspace_id: str
    agent_profile_id: str
    trigger: RunTrigger
    status: RunStatus
    dry_run: bool
    requested_by: str
    command_preview: str
    started_at: datetime
    finished_at: datetime | None = None
    exit_code: int | None = None


class RunPreviewRead(ModelBase):
    workspace_id: str
    workspace_name: str
    workspace_slug: str
    workspace_root_path: str
    agent_profile_id: str
    agent_name: str
    agent_runtime: str
    policy_id: str
    policy_name: str
    dry_run: bool
    command_preview: str
    execution_enabled: bool
    allow_write: bool
    allow_network: bool
    allowed_command_prefixes: list[str]
    blocking_reasons: list[str]


class RunLogRead(ModelBase):
    id: str
    run_id: str
    level: str
    message: str
    timestamp: datetime


class RunArtifactRead(ModelBase):
    id: str
    run_id: str
    name: str
    relative_path: str
    media_type: str
    created_at: datetime
