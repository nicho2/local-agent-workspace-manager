from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas.common import ModelBase


class WorkspaceStatus(StrEnum):
    active = "active"
    archived = "archived"


class WorkspaceCreate(ModelBase):
    name: str = Field(min_length=3, max_length=120)
    slug: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9][a-z0-9-]+$")
    root_path: str = Field(min_length=1)
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    status: WorkspaceStatus = WorkspaceStatus.active
    policy_id: str | None = None


class WorkspaceRead(WorkspaceCreate):
    id: str
    policy_id: str
    created_at: datetime
    updated_at: datetime
