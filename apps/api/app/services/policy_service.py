import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from app.core.errors import conflict, internal_error, not_found
from app.db.database import get_connection, utc_now_iso
from app.schemas.common import DeleteSummary
from app.schemas.policy import WorkspacePolicyCreate, WorkspacePolicyRead, WorkspacePolicyUpdate


def _row_to_policy(row: object) -> WorkspacePolicyRead:
    assert isinstance(row, dict) or hasattr(row, "__getitem__")
    return WorkspacePolicyRead(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        max_runtime_seconds=row["max_runtime_seconds"],
        allow_write=bool(row["allow_write"]),
        allow_network=bool(row["allow_network"]),
        allowed_command_prefixes=json.loads(row["allowed_command_prefixes"]),
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


def list_policies(database_path: Path) -> list[WorkspacePolicyRead]:
    with get_connection(database_path) as connection:
        rows = connection.execute(
            "SELECT * FROM workspace_policies ORDER BY name ASC"
        ).fetchall()
    return [_row_to_policy(row) for row in rows]


def get_policy(database_path: Path, policy_id: str) -> WorkspacePolicyRead:
    with get_connection(database_path) as connection:
        row = connection.execute(
            "SELECT * FROM workspace_policies WHERE id = ?",
            (policy_id,),
        ).fetchone()
    if row is None:
        raise not_found("policy", policy_id)
    return _row_to_policy(row)


def get_default_policy_id(database_path: Path) -> str:
    with get_connection(database_path) as connection:
        row = connection.execute(
            "SELECT id FROM workspace_policies WHERE name = 'default-safe'"
        ).fetchone()
    if row is None:
        raise internal_error("default_policy_missing", "Default policy is missing")
    return str(row["id"])


def create_policy(database_path: Path, payload: WorkspacePolicyCreate) -> WorkspacePolicyRead:
    policy_id = f"policy_{uuid4().hex[:12]}"
    now = utc_now_iso()
    with get_connection(database_path) as connection:
        existing = connection.execute(
            "SELECT id FROM workspace_policies WHERE name = ?",
            (payload.name,),
        ).fetchone()
        if existing is not None:
            raise conflict(
                "policy_name_conflict",
                "Policy name already exists",
                {"name": payload.name},
            )

        connection.execute(
            '''
            INSERT INTO workspace_policies (
                id, name, description, max_runtime_seconds, allow_write,
                allow_network, allowed_command_prefixes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                policy_id,
                payload.name,
                payload.description,
                payload.max_runtime_seconds,
                int(payload.allow_write),
                int(payload.allow_network),
                json.dumps(payload.allowed_command_prefixes),
                now,
                now,
            ),
        )
        row = connection.execute(
            "SELECT * FROM workspace_policies WHERE id = ?",
            (policy_id,),
        ).fetchone()
    if row is None:
        raise internal_error("policy_create_failed", "Failed to create policy")
    return _row_to_policy(row)


def update_policy(
    database_path: Path,
    policy_id: str,
    payload: WorkspacePolicyUpdate,
) -> WorkspacePolicyRead:
    fields_set = payload.model_fields_set
    updates: list[str] = []
    values: list[object] = []

    with get_connection(database_path) as connection:
        existing = connection.execute(
            "SELECT * FROM workspace_policies WHERE id = ?",
            (policy_id,),
        ).fetchone()
        if existing is None:
            raise not_found("policy", policy_id)

        if "name" in fields_set:
            name_match = connection.execute(
                "SELECT id FROM workspace_policies WHERE name = ? AND id != ?",
                (payload.name, policy_id),
            ).fetchone()
            if name_match is not None:
                raise conflict(
                    "policy_name_conflict",
                    "Policy name already exists",
                    {"name": payload.name},
                )
            updates.append("name = ?")
            values.append(payload.name)

        if "description" in fields_set:
            updates.append("description = ?")
            values.append(payload.description)

        if "max_runtime_seconds" in fields_set:
            updates.append("max_runtime_seconds = ?")
            values.append(payload.max_runtime_seconds)

        if "allow_write" in fields_set:
            updates.append("allow_write = ?")
            values.append(int(bool(payload.allow_write)))

        if "allow_network" in fields_set:
            updates.append("allow_network = ?")
            values.append(int(bool(payload.allow_network)))

        if "allowed_command_prefixes" in fields_set:
            updates.append("allowed_command_prefixes = ?")
            values.append(json.dumps(payload.allowed_command_prefixes or []))

        if updates:
            updates.append("updated_at = ?")
            values.append(utc_now_iso())
            values.append(policy_id)
            connection.execute(
                f"UPDATE workspace_policies SET {', '.join(updates)} WHERE id = ?",
                values,
            )

        row = connection.execute(
            "SELECT * FROM workspace_policies WHERE id = ?",
            (policy_id,),
        ).fetchone()

    if row is None:
        raise internal_error("policy_update_failed", "Failed to update policy")
    return _row_to_policy(row)


def delete_policy(database_path: Path, policy_id: str) -> DeleteSummary:
    with get_connection(database_path) as connection:
        existing = connection.execute(
            "SELECT id FROM workspace_policies WHERE id = ?",
            (policy_id,),
        ).fetchone()
        if existing is None:
            raise not_found("policy", policy_id)

        workspace_count = int(
            connection.execute(
                "SELECT COUNT(*) AS count FROM workspaces WHERE policy_id = ?",
                (policy_id,),
            ).fetchone()["count"]
        )
        if workspace_count > 0:
            raise conflict(
                "policy_delete_blocked_by_workspaces",
                "Policy is still attached to workspaces",
                {"policy_id": policy_id, "workspaces": workspace_count},
            )

        connection.execute("DELETE FROM workspace_policies WHERE id = ?", (policy_id,))

    return DeleteSummary(
        resource="policy",
        id=policy_id,
        deleted=True,
        deleted_counts={"policies": 1},
    )
