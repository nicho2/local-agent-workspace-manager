from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleUpdate
from app.services.schedule_service import create_schedule, list_schedules, update_schedule

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.get("", response_model=list[ScheduleRead])
def get_schedules() -> list[ScheduleRead]:
    return list_schedules(get_settings().database_path)


@router.post("", response_model=ScheduleRead, status_code=201)
def post_schedule(payload: ScheduleCreate) -> ScheduleRead:
    return create_schedule(get_settings().database_path, payload)


@router.put("/{schedule_id}", response_model=ScheduleRead)
def put_schedule(schedule_id: str, payload: ScheduleUpdate) -> ScheduleRead:
    return update_schedule(get_settings().database_path, schedule_id, payload)
