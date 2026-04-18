from datetime import datetime
from typing import Annotated

from typing import Self

from pydantic import Field, model_validator

from app.schemas.common import ModelBase

CommandPrefix = Annotated[str, Field(min_length=1)]


class WorkspacePolicyCreate(ModelBase):
    name: str = Field(min_length=3, max_length=120)
    description: str | None = None
    max_runtime_seconds: int = Field(default=900, ge=30, le=7200)
    allow_write: bool = False
    allow_network: bool = False
    allowed_command_prefixes: list[CommandPrefix] = Field(default_factory=list)


class WorkspacePolicyRead(WorkspacePolicyCreate):
    id: str
    created_at: datetime
    updated_at: datetime


class WorkspacePolicyUpdate(ModelBase):
    name: str | None = Field(default=None, min_length=3, max_length=120)
    description: str | None = None
    max_runtime_seconds: int | None = Field(default=None, ge=30, le=7200)
    allow_write: bool | None = None
    allow_network: bool | None = None
    allowed_command_prefixes: list[CommandPrefix] | None = None

    @model_validator(mode="after")
    def reject_null_required_fields(self) -> Self:
        required_when_present = {
            "name",
            "max_runtime_seconds",
            "allow_write",
            "allow_network",
            "allowed_command_prefixes",
        }
        null_fields = [
            field
            for field in required_when_present
            if field in self.model_fields_set and getattr(self, field) is None
        ]
        if null_fields:
            raise ValueError(f"Fields cannot be null: {', '.join(sorted(null_fields))}")
        return self
