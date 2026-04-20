from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.run import RunArtifactRead, RunCreate, RunLogRead, RunPreviewRead, RunRead
from app.services.run_service import (
    create_run,
    get_run,
    list_run_artifacts,
    list_run_logs,
    list_runs,
    preview_run,
)

router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("", response_model=list[RunRead])
def get_runs() -> list[RunRead]:
    return list_runs(get_settings().database_path)


@router.post("/preview", response_model=RunPreviewRead)
def post_run_preview(payload: RunCreate) -> RunPreviewRead:
    return preview_run(get_settings().database_path, payload)


@router.get("/{run_id}", response_model=RunRead)
def get_run_by_id(run_id: str) -> RunRead:
    return get_run(get_settings().database_path, run_id)


@router.get("/{run_id}/logs", response_model=list[RunLogRead])
def get_run_logs(run_id: str) -> list[RunLogRead]:
    return list_run_logs(get_settings().database_path, run_id)


@router.get("/{run_id}/artifacts", response_model=list[RunArtifactRead])
def get_run_artifacts(run_id: str) -> list[RunArtifactRead]:
    return list_run_artifacts(get_settings().database_path, run_id)


@router.post("", response_model=RunRead, status_code=201)
def post_run(payload: RunCreate) -> RunRead:
    return create_run(get_settings().database_path, payload)
