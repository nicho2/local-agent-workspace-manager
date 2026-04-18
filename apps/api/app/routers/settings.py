from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.settings import SystemSettingRead, SystemSettingUpdate
from app.services.settings_service import list_settings, update_setting

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=list[SystemSettingRead])
def get_settings_route() -> list[SystemSettingRead]:
    return list_settings(get_settings().database_path)


@router.put("/{key}", response_model=SystemSettingRead)
def put_setting(key: str, payload: SystemSettingUpdate) -> SystemSettingRead:
    return update_setting(get_settings().database_path, key, payload.value)
