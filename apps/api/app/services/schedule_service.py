from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.db.database import get_connection, utc_now_iso
from app.schemas.schedule import ScheduleCreate, ScheduleMode, ScheduleRead


def _row_to_schedule(row: object) -> ScheduleRead:
    assert isinstance(row, dict) or hasattr(row, "__getitem__")
    next_run_at = row["next_run_at"]
    return ScheduleRead(
        id=row["id"],
        name=row["name"],
        workspace_id=row["workspace_id"],
        agent_profile_id=row["agent_profile_id"],
        mode=row["mode"],
        interval_minutes=row["interval_minutes"],
        cron_expression=row["cron_expression"],
        enabled=bool(row["enabled"]),
        next_run_at=datetime.fromisoformat(next_run_at) if next_run_at else None,
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


def _calculate_next_run(payload: ScheduleCreate) -> str | None:
    if not payload.enabled:
        return None
    if payload.mode == ScheduleMode.interval and payload.interval_minutes is not None:
        target = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(
            minutes=payload.interval_minutes
        )
        return target.isoformat()
    return None


def list_schedules(database_path: Path) -> list[ScheduleRead]:
    with get_connection(database_path) as connection:
        rows = connection.execute("SELECT * FROM schedules ORDER BY name ASC").fetchall()
    return [_row_to_schedule(row) for row in rows]


def create_schedule(database_path: Path, payload: ScheduleCreate) -> ScheduleRead:
    schedule_id = f"sched_{uuid4().hex[:12]}"
    now = utc_now_iso()
    next_run_at = _calculate_next_run(payload)

    with get_connection(database_path) as connection:
        workspace_row = connection.execute(
            "SELECT id FROM workspaces WHERE id = ?",
            (payload.workspace_id,),
        ).fetchone()
        if workspace_row is None:
            raise HTTPException(status_code=400, detail="Unknown workspace_id")

        agent_row = connection.execute(
            "SELECT id FROM agent_profiles WHERE id = ?",
            (payload.agent_profile_id,),
        ).fetchone()
        if agent_row is None:
            raise HTTPException(status_code=400, detail="Unknown agent_profile_id")

        connection.execute(
            '''
            INSERT INTO schedules (
                id, name, workspace_id, agent_profile_id, mode, interval_minutes,
                cron_expression, enabled, next_run_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                schedule_id,
                payload.name,
                payload.workspace_id,
                payload.agent_profile_id,
                payload.mode.value,
                payload.interval_minutes,
                payload.cron_expression,
                int(payload.enabled),
                next_run_at,
                now,
                now,
            ),
        )
        row = connection.execute(
            "SELECT * FROM schedules WHERE id = ?",
            (schedule_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=500, detail="Failed to create schedule")
    return _row_to_schedule(row)
