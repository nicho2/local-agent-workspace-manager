from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.db.database import ensure_database
from app.routers import agents, dashboard, health, policies, runs, schedules, settings, workspaces


@asynccontextmanager
async def lifespan(_: FastAPI):
    current_settings = get_settings()
    current_settings.workspace_root.mkdir(parents=True, exist_ok=True)
    current_settings.logs_root.mkdir(parents=True, exist_ok=True)
    current_settings.artifacts_root.mkdir(parents=True, exist_ok=True)
    ensure_database(current_settings.database_path)
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="Local Agent Workspace Manager API",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.include_router(health.router)
    application.include_router(dashboard.router)
    application.include_router(policies.router)
    application.include_router(workspaces.router)
    application.include_router(agents.router)
    application.include_router(schedules.router)
    application.include_router(runs.router)
    application.include_router(settings.router)
    return application


app = create_app()
