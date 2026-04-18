from datetime import datetime

from pydantic import Field

from app.schemas.common import ModelBase


class SystemSettingRead(ModelBase):
    key: str
    value: str
    description: str
    updated_at: datetime


class SystemSettingUpdate(ModelBase):
    value: str = Field(min_length=1)
