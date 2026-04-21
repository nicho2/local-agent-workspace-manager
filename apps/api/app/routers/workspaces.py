from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.common import DeleteSummary
from app.schemas.workspace import (
    WorkspaceAllowedRootsRead,
    WorkspaceCreate,
    WorkspaceRead,
    WorkspaceUpdate,
)
from app.services.workspace_service import (
    create_workspace,
    delete_workspace,
    get_workspace_delete_summary,
    get_workspace,
    list_workspaces,
    update_workspace,
)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceRead])
def get_workspaces() -> list[WorkspaceRead]:
    return list_workspaces(get_settings().database_path)


@router.get("/allowed-roots", response_model=WorkspaceAllowedRootsRead)
def get_workspace_allowed_roots() -> WorkspaceAllowedRootsRead:
    allowed_roots = [
        str(allowed_root) for allowed_root in get_settings().resolved_workspace_allowed_roots
    ]
    return WorkspaceAllowedRootsRead(allowed_roots=allowed_roots)


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace_by_id(workspace_id: str) -> WorkspaceRead:
    return get_workspace(get_settings().database_path, workspace_id)


@router.get("/{workspace_id}/delete-summary", response_model=DeleteSummary)
def get_workspace_delete_summary_by_id(workspace_id: str) -> DeleteSummary:
    return get_workspace_delete_summary(get_settings().database_path, workspace_id)


@router.post("", response_model=WorkspaceRead, status_code=201)
def post_workspace(payload: WorkspaceCreate) -> WorkspaceRead:
    return create_workspace(get_settings().database_path, payload)


@router.put("/{workspace_id}", response_model=WorkspaceRead)
def put_workspace(workspace_id: str, payload: WorkspaceUpdate) -> WorkspaceRead:
    return update_workspace(get_settings().database_path, workspace_id, payload)


@router.delete("/{workspace_id}", response_model=DeleteSummary)
def delete_workspace_by_id(
    workspace_id: str,
    confirmation: str | None = None,
) -> DeleteSummary:
    return delete_workspace(get_settings().database_path, workspace_id, confirmation)
