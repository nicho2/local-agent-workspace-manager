from datetime import datetime

from pydantic import Field

from app.schemas.common import ModelBase


class WorkspacePolicyCreate(ModelBase):
    name: str = Field(min_length=3, max_length=120)
    description: str | None = None
    max_runtime_seconds: int = Field(default=900, ge=30, le=7200)
    allow_write: bool = False
    allow_network: bool = False
    allowed_command_prefixes: list[str] = Field(default_factory=list)


class WorkspacePolicyRead(WorkspacePolicyCreate):
    id: str
    created_at: datetime
    updated_at: datetime
