import json
from datetime import datetime
from pathlib import Path
from sqlite3 import Connection
from uuid import uuid4

from app.core.config import get_settings
from app.core.errors import bad_request, conflict, internal_error, not_found
from app.db.database import get_connection, utc_now_iso
from app.schemas.common import DeleteSummary
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead, WorkspaceUpdate
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


def update_workspace(
    database_path: Path,
    workspace_id: str,
    payload: WorkspaceUpdate,
) -> WorkspaceRead:
    fields_set = payload.model_fields_set
    updates: list[str] = []
    values: list[object] = []

    with get_connection(database_path) as connection:
        existing = connection.execute(
            "SELECT * FROM workspaces WHERE id = ?",
            (workspace_id,),
        ).fetchone()
        if existing is None:
            raise not_found("workspace", workspace_id)

        if "policy_id" in fields_set:
            policy_id = payload.policy_id
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
            updates.append("policy_id = ?")
            values.append(policy_id)

        if "root_path" in fields_set:
            assert payload.root_path is not None
            updates.append("root_path = ?")
            values.append(str(_normalize_workspace_root_path(payload.root_path)))

        if "name" in fields_set:
            updates.append("name = ?")
            values.append(payload.name)

        if "description" in fields_set:
            updates.append("description = ?")
            values.append(payload.description)

        if "tags" in fields_set:
            updates.append("tags = ?")
            values.append(json.dumps(payload.tags or []))

        if "status" in fields_set:
            assert payload.status is not None
            updates.append("status = ?")
            values.append(payload.status.value)

        if updates:
            updates.append("updated_at = ?")
            values.append(utc_now_iso())
            values.append(workspace_id)
            connection.execute(
                f"UPDATE workspaces SET {', '.join(updates)} WHERE id = ?",
                values,
            )

        row = connection.execute(
            "SELECT * FROM workspaces WHERE id = ?",
            (workspace_id,),
        ).fetchone()

    if row is None:
        raise internal_error("workspace_update_failed", "Failed to update workspace")
    return _row_to_workspace(row)


def _safe_delete_artifact_file(relative_path: str) -> bool:
    artifacts_root = get_settings().artifacts_root.expanduser().resolve()
    artifact_path = (artifacts_root / relative_path).expanduser().resolve()
    try:
        artifact_path.relative_to(artifacts_root)
    except ValueError:
        return False
    if artifact_path.is_file():
        artifact_path.unlink()
        return True
    return False


def get_workspace_delete_summary(database_path: Path, workspace_id: str) -> DeleteSummary:
    with get_connection(database_path) as connection:
        _, _, _, _, artifact_paths, dependency_counts = _workspace_delete_plan(
            connection,
            workspace_id,
        )

    existing_artifact_files = sum(
        1 for relative_path in artifact_paths if _artifact_file_exists(relative_path)
    )
    return DeleteSummary(
        resource="workspace",
        id=workspace_id,
        deleted=False,
        deleted_counts={
            **dependency_counts,
            "artifacts": len(artifact_paths),
            "artifact_files": existing_artifact_files,
        },
    )


def delete_workspace(
    database_path: Path,
    workspace_id: str,
    confirmation: str | None,
) -> DeleteSummary:
    with get_connection(database_path) as connection:
        workspace, _, schedule_ids, run_ids, artifact_paths, dependency_counts = (
            _workspace_delete_plan(connection, workspace_id)
        )
        if confirmation != workspace["slug"]:
            raise conflict(
                "workspace_delete_confirmation_required",
                "Workspace deletion requires exact slug confirmation",
                {
                    "workspace_id": workspace_id,
                    "required_confirmation": str(workspace["slug"]),
                    "agents": dependency_counts["agents"],
                    "schedules": dependency_counts["schedules"],
                    "runs": dependency_counts["runs"],
                },
            )

        if run_ids:
            placeholders = ", ".join("?" for _ in run_ids)
            connection.execute(
                f"DELETE FROM run_artifacts WHERE run_id IN ({placeholders})",
                run_ids,
            )
            connection.execute(
                f"DELETE FROM run_logs WHERE run_id IN ({placeholders})",
                run_ids,
            )
            connection.execute(
                f"DELETE FROM runs WHERE id IN ({placeholders})",
                run_ids,
            )

        if schedule_ids:
            placeholders = ", ".join("?" for _ in schedule_ids)
            connection.execute(
                f"DELETE FROM schedules WHERE id IN ({placeholders})",
                schedule_ids,
            )
        connection.execute("DELETE FROM agent_profiles WHERE workspace_id = ?", (workspace_id,))
        connection.execute("DELETE FROM workspaces WHERE id = ?", (workspace_id,))

    deleted_files = sum(1 for relative_path in artifact_paths if _safe_delete_artifact_file(relative_path))
    return DeleteSummary(
        resource="workspace",
        id=workspace_id,
        deleted=True,
        deleted_counts={
            **dependency_counts,
            "artifacts": len(artifact_paths),
            "artifact_files": deleted_files,
        },
    )


def _artifact_file_exists(relative_path: str) -> bool:
    artifacts_root = get_settings().artifacts_root.expanduser().resolve()
    artifact_path = (artifacts_root / relative_path).expanduser().resolve()
    try:
        artifact_path.relative_to(artifacts_root)
    except ValueError:
        return False
    return artifact_path.is_file()


def _workspace_delete_plan(
    connection: Connection,
    workspace_id: str,
) -> tuple[object, list[str], list[str], list[str], list[str], dict[str, int]]:
    workspace = connection.execute(
        "SELECT id, slug FROM workspaces WHERE id = ?",
        (workspace_id,),
    ).fetchone()
    if workspace is None:
        raise not_found("workspace", workspace_id)

    scoped_agent_rows = connection.execute(
        "SELECT id FROM agent_profiles WHERE workspace_id = ?",
        (workspace_id,),
    ).fetchall()
    scoped_agent_ids = [str(row["id"]) for row in scoped_agent_rows]
    schedule_ids = _ids_for_workspace_dependents(
        connection,
        table="schedules",
        workspace_id=workspace_id,
        scoped_agent_ids=scoped_agent_ids,
        agent_column="agent_profile_id",
    )
    run_ids = _ids_for_workspace_dependents(
        connection,
        table="runs",
        workspace_id=workspace_id,
        scoped_agent_ids=scoped_agent_ids,
        agent_column="agent_profile_id",
    )
    artifact_paths: list[str] = []
    if run_ids:
        placeholders = ", ".join("?" for _ in run_ids)
        artifact_rows = connection.execute(
            f"SELECT relative_path FROM run_artifacts WHERE run_id IN ({placeholders})",
            run_ids,
        ).fetchall()
        artifact_paths = [str(row["relative_path"]) for row in artifact_rows]

    dependency_counts = {
        "agents": len(scoped_agent_ids),
        "schedules": len(schedule_ids),
        "runs": len(run_ids),
    }
    return workspace, scoped_agent_ids, schedule_ids, run_ids, artifact_paths, dependency_counts


def _ids_for_workspace_dependents(
    connection: Connection,
    *,
    table: str,
    workspace_id: str,
    scoped_agent_ids: list[str],
    agent_column: str,
) -> list[str]:
    assert table in {"runs", "schedules"}
    assert agent_column == "agent_profile_id"
    if not scoped_agent_ids:
        rows = connection.execute(
            f"SELECT id FROM {table} WHERE workspace_id = ?",
            (workspace_id,),
        ).fetchall()
        return [str(row["id"]) for row in rows]

    placeholders = ", ".join("?" for _ in scoped_agent_ids)
    rows = connection.execute(
        f"""
        SELECT id FROM {table}
        WHERE workspace_id = ? OR {agent_column} IN ({placeholders})
        """,
        [workspace_id, *scoped_agent_ids],
    ).fetchall()
    return [str(row["id"]) for row in rows]
