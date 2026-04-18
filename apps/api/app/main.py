import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import AppError, app_error_handler
from app.db.database import ensure_database
from app.routers import agents, dashboard, health, policies, runs, schedules, settings, workspaces
from app.services.schedule_worker_service import run_schedule_worker_loop


@asynccontextmanager
async def lifespan(_: FastAPI):
    current_settings = get_settings()
    current_settings.workspace_root.mkdir(parents=True, exist_ok=True)
    current_settings.logs_root.mkdir(parents=True, exist_ok=True)
    current_settings.artifacts_root.mkdir(parents=True, exist_ok=True)
    ensure_database(
        current_settings.database_path,
        execution_enabled_default=current_settings.execution_enabled,
    )
    worker_task: asyncio.Task[None] | None = None
    if current_settings.schedule_worker_enabled:
        worker_task = asyncio.create_task(
            run_schedule_worker_loop(
                database_path=current_settings.database_path,
                poll_seconds=current_settings.schedule_worker_poll_seconds,
            )
        )
    try:
        yield
    finally:
        if worker_task is not None:
            worker_task.cancel()
            try:
                await worker_task
            except asyncio.CancelledError:
                pass


def create_app() -> FastAPI:
    current_settings = get_settings()
    application = FastAPI(
        title="Local Agent Workspace Manager API",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=current_settings.cors_allowed_origins,
        allow_methods=["GET", "POST", "PUT", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    application.include_router(health.router)
    application.include_router(dashboard.router)
    application.include_router(policies.router)
    application.include_router(workspaces.router)
    application.include_router(agents.router)
    application.include_router(schedules.router)
    application.include_router(runs.router)
    application.include_router(settings.router)
    application.add_exception_handler(AppError, app_error_handler)
    return application


app = create_app()
