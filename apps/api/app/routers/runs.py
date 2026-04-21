import asyncio
import json
from collections.abc import AsyncIterator

from fastapi import APIRouter
from starlette.responses import StreamingResponse

from app.core.config import get_settings
from app.schemas.run import RunArtifactRead, RunCreate, RunLogRead, RunPreviewRead, RunRead, RunStatus
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


@router.get("/{run_id}/events")
async def get_run_events(run_id: str) -> StreamingResponse:
    return StreamingResponse(
        _run_event_stream(run_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


@router.post("", response_model=RunRead, status_code=201)
def post_run(payload: RunCreate) -> RunRead:
    return create_run(get_settings().database_path, payload)


async def _run_event_stream(run_id: str) -> AsyncIterator[str]:
    database_path = get_settings().database_path
    sent_log_ids: set[str] = set()
    terminal_statuses = {RunStatus.completed, RunStatus.failed, RunStatus.blocked}

    while True:
        run = get_run(database_path, run_id)
        yield _sse("run", run.model_dump(mode="json"))

        for log in list_run_logs(database_path, run_id):
            if log.id in sent_log_ids:
                continue
            sent_log_ids.add(log.id)
            yield _sse("log", log.model_dump(mode="json"))

        if run.status in terminal_statuses:
            break
        await asyncio.sleep(1)


def _sse(event: str, payload: object) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"
