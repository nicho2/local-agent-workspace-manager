from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field

ErrorDetails = dict[str, str | int | float | bool | None]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class APIMessage(BaseModel):
    message: str


class APIError(BaseModel):
    code: str
    message: str
    details: ErrorDetails = Field(default_factory=dict)


class ModelBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
