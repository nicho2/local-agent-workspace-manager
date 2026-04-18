from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class APIMessage(BaseModel):
    message: str


class ModelBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
