import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.db.database import get_connection, utc_now_iso
from app.schemas.agent import AgentProfileCreate, AgentProfileRead


def _row_to_agent(row: object) -> AgentProfileRead:
    assert isinstance(row, dict) or hasattr(row, "__getitem__")
    return AgentProfileRead(
        id=row["id"],
        name=row["name"],
        runtime=row["runtime"],
        workspace_id=row["workspace_id"],
        command_template=row["command_template"],
        system_prompt=row["system_prompt"],
        environment=json.loads(row["environment"]),
        is_active=bool(row["is_active"]),
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


def list_agents(database_path: Path) -> list[AgentProfileRead]:
    with get_connection(database_path) as connection:
        rows = connection.execute("SELECT * FROM agent_profiles ORDER BY name ASC").fetchall()
    return [_row_to_agent(row) for row in rows]


def get_agent(database_path: Path, agent_id: str) -> AgentProfileRead:
    with get_connection(database_path) as connection:
        row = connection.execute(
            "SELECT * FROM agent_profiles WHERE id = ?",
            (agent_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Agent profile not found")
    return _row_to_agent(row)


def create_agent(database_path: Path, payload: AgentProfileCreate) -> AgentProfileRead:
    agent_id = f"agent_{uuid4().hex[:12]}"
    now = utc_now_iso()

    with get_connection(database_path) as connection:
        if payload.workspace_id:
            workspace_row = connection.execute(
                "SELECT id FROM workspaces WHERE id = ?",
                (payload.workspace_id,),
            ).fetchone()
            if workspace_row is None:
                raise HTTPException(status_code=400, detail="Unknown workspace_id")

        connection.execute(
            '''
            INSERT INTO agent_profiles (
                id, name, runtime, workspace_id, command_template, system_prompt,
                environment, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                agent_id,
                payload.name,
                payload.runtime.value,
                payload.workspace_id,
                payload.command_template,
                payload.system_prompt,
                json.dumps(payload.environment),
                int(payload.is_active),
                now,
                now,
            ),
        )
        row = connection.execute(
            "SELECT * FROM agent_profiles WHERE id = ?",
            (agent_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=500, detail="Failed to create agent profile")
    return _row_to_agent(row)
