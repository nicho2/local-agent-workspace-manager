import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.core.errors import bad_request, conflict, internal_error, not_found
from app.db.database import get_connection, utc_now_iso
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead
from app.services.policy_service import get_default_policy_id


def _row_to_workspace(row: object) -> WorkspaceRead:
    assert isinstance(row, dict) or hasattr(row, "__getitem__")
    return WorkspaceRead(
        id=row["id"],
        name=row["name"],
        slug=row["slug"],
        root_path=row["root_path"],
        description=row["description"],
        tags=json.loads(row["tags"]),
        status=row["status"],
        policy_id=row["policy_id"],
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


def list_workspaces(database_path: Path) -> list[WorkspaceRead]:
    with get_connection(database_path) as connection:
        rows = connection.execute("SELECT * FROM workspaces ORDER BY name ASC").fetchall()
    return [_row_to_workspace(row) for row in rows]


def get_workspace(database_path: Path, workspace_id: str) -> WorkspaceRead:
    with get_connection(database_path) as connection:
        row = connection.execute(
            "SELECT * FROM workspaces WHERE id = ?",
            (workspace_id,),
        ).fetchone()
    if row is None:
        raise not_found("workspace", workspace_id)
    return _row_to_workspace(row)


def _is_path_inside(path: Path, allowed_root: Path) -> bool:
    try:
        path.relative_to(allowed_root)
    except ValueError:
        return False
    return True


def _normalize_workspace_root_path(root_path: str) -> Path:
    normalized_path = Path(root_path).expanduser().resolve()
    allowed_roots = get_settings().resolved_workspace_allowed_roots

    if not any(_is_path_inside(normalized_path, allowed_root) for allowed_root in allowed_roots):
        raise bad_request(
            "workspace_root_outside_allowed_roots",
            "Workspace root_path must be inside an allowed workspace root",
            {
                "root_path": str(normalized_path),
                "allowed_roots": [str(allowed_root) for allowed_root in allowed_roots],
            },
        )

    return normalized_path


def create_workspace(database_path: Path, payload: WorkspaceCreate) -> WorkspaceRead:
    workspace_id = f"ws_{uuid4().hex[:12]}"
    now = utc_now_iso()
    policy_id = payload.policy_id or get_default_policy_id(database_path)
    normalized_root_path = _normalize_workspace_root_path(payload.root_path)

    with get_connection(database_path) as connection:
        slug_match = connection.execute(
            "SELECT id FROM workspaces WHERE slug = ?",
            (payload.slug,),
        ).fetchone()
        if slug_match is not None:
            raise conflict(
                "workspace_slug_conflict",
                "Workspace slug already exists",
                {"slug": payload.slug},
            )

        policy_match = connection.execute(
            "SELECT id FROM workspace_policies WHERE id = ?",
            (policy_id,),
        ).fetchone()
        if policy_match is None:
            raise bad_request(
                "unknown_policy_id",
                "Unknown policy_id",
                {"policy_id": policy_id},
            )

        connection.execute(
            '''
            INSERT INTO workspaces (
                id, name, slug, root_path, description, tags, status,
                policy_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                workspace_id,
                payload.name,
                payload.slug,
                str(normalized_root_path),
                payload.description,
                json.dumps(payload.tags),
                payload.status.value,
                policy_id,
                now,
                now,
            ),
        )
        row = connection.execute(
            "SELECT * FROM workspaces WHERE id = ?",
            (workspace_id,),
        ).fetchone()
    if row is None:
        raise internal_error("workspace_create_failed", "Failed to create workspace")
    return _row_to_workspace(row)
