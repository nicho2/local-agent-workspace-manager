from datetime import datetime
from enum import StrEnum
from typing import Self

from pydantic import Field, model_validator

from app.schemas.common import ModelBase


class ScheduleMode(StrEnum):
    manual = "manual"
    interval = "interval"
    cron = "cron"


class ScheduleCreate(ModelBase):
    name: str = Field(min_length=3, max_length=120)
    workspace_id: str
    agent_profile_id: str
    mode: ScheduleMode
    interval_minutes: int | None = Field(default=None, ge=5, le=10080)
    cron_expression: str | None = None
    enabled: bool = True

    @model_validator(mode="after")
    def validate_mode(self) -> "ScheduleCreate":
        if self.mode == ScheduleMode.interval and self.interval_minutes is None:
            raise ValueError("interval_minutes is required when mode=interval")
        if self.mode == ScheduleMode.cron and not self.cron_expression:
            raise ValueError("cron_expression is required when mode=cron")
        return self


class ScheduleRead(ScheduleCreate):
    id: str
    next_run_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ScheduleUpdate(ModelBase):
    name: str | None = Field(default=None, min_length=3, max_length=120)
    workspace_id: str | None = None
    agent_profile_id: str | None = None
    mode: ScheduleMode | None = None
    interval_minutes: int | None = Field(default=None, ge=5, le=10080)
    cron_expression: str | None = None
    enabled: bool | None = None

    @model_validator(mode="after")
    def reject_null_required_fields(self) -> Self:
        required_when_present = {
            "name",
            "workspace_id",
            "agent_profile_id",
            "mode",
            "enabled",
        }
        null_fields = [
            field
            for field in required_when_present
            if field in self.model_fields_set and getattr(self, field) is None
        ]
        if null_fields:
            raise ValueError(f"Fields cannot be null: {', '.join(sorted(null_fields))}")
        return self
