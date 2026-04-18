from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead
from app.services.workspace_service import create_workspace, get_workspace, list_workspaces

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceRead])
def get_workspaces() -> list[WorkspaceRead]:
    return list_workspaces(get_settings().database_path)


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace_by_id(workspace_id: str) -> WorkspaceRead:
    return get_workspace(get_settings().database_path, workspace_id)


@router.post("", response_model=WorkspaceRead, status_code=201)
def post_workspace(payload: WorkspaceCreate) -> WorkspaceRead:
    return create_workspace(get_settings().database_path, payload)
