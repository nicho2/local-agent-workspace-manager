from datetime import datetime

from app.schemas.common import ModelBase


class SafetyPolicySignal(ModelBase):
    id: str
    name: str
    allow_write: bool
    allow_network: bool
    allowed_command_prefixes: list[str]


class SafetyAgentSignal(ModelBase):
    id: str
    name: str
    runtime: str
    workspace_id: str | None
    workspace_name: str | None


class SafetyScheduleSignal(ModelBase):
    id: str
    name: str
    mode: str
    workspace_id: str
    workspace_name: str
    agent_profile_id: str
    agent_name: str
    next_run_at: datetime | None = None


class SafetyRunSignal(ModelBase):
    id: str
    status: str
    trigger: str
    dry_run: bool
    workspace_id: str
    workspace_name: str
    agent_profile_id: str
    agent_name: str
    started_at: datetime


class SafetySummary(ModelBase):
    execution_enabled: bool
    allowed_roots: list[str]
    permissive_policies: list[SafetyPolicySignal]
    active_agents: list[SafetyAgentSignal]
    active_schedules: list[SafetyScheduleSignal]
    recent_attention_runs: list[SafetyRunSignal]
