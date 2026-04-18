from datetime import datetime
from enum import StrEnum

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
