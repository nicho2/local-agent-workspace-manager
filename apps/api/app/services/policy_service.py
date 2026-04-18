import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from app.core.errors import conflict, internal_error, not_found
from app.db.database import get_connection, utc_now_iso
from app.schemas.policy import WorkspacePolicyCreate, WorkspacePolicyRead


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
