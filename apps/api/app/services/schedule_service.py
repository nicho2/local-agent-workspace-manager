from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from app.core.errors import bad_request, internal_error, not_found
from app.db.database import get_connection, utc_now_iso
from app.schemas.schedule import ScheduleCreate, ScheduleMode, ScheduleRead, ScheduleUpdate


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


def _calculate_next_run(
    *,
    enabled: bool,
    mode: ScheduleMode,
    interval_minutes: int | None,
) -> str | None:
    if not enabled:
        return None
    if mode == ScheduleMode.interval and interval_minutes is not None:
        target = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(
            minutes=interval_minutes
        )
        return target.isoformat()
    return None


def _validate_schedule_shape(
    *,
    mode: ScheduleMode,
    interval_minutes: int | None,
    cron_expression: str | None,
) -> None:
    if mode == ScheduleMode.interval and interval_minutes is None:
        raise bad_request(
            "schedule_interval_minutes_required",
            "interval_minutes is required when mode=interval",
            {"mode": mode.value},
        )
    if mode == ScheduleMode.cron and not cron_expression:
        raise bad_request(
            "schedule_cron_expression_required",
            "cron_expression is required when mode=cron",
            {"mode": mode.value},
        )


def list_schedules(database_path: Path) -> list[ScheduleRead]:
    with get_connection(database_path) as connection:
        rows = connection.execute("SELECT * FROM schedules ORDER BY name ASC").fetchall()
    return [_row_to_schedule(row) for row in rows]


def create_schedule(database_path: Path, payload: ScheduleCreate) -> ScheduleRead:
    schedule_id = f"sched_{uuid4().hex[:12]}"
    now = utc_now_iso()
    next_run_at = _calculate_next_run(
        enabled=payload.enabled,
        mode=payload.mode,
        interval_minutes=payload.interval_minutes,
    )

    with get_connection(database_path) as connection:
        workspace_row = connection.execute(
            "SELECT id FROM workspaces WHERE id = ?",
            (payload.workspace_id,),
        ).fetchone()
        if workspace_row is None:
            raise bad_request(
                "unknown_workspace_id",
                "Unknown workspace_id",
                {"workspace_id": payload.workspace_id},
            )

        agent_row = connection.execute(
            "SELECT id FROM agent_profiles WHERE id = ?",
            (payload.agent_profile_id,),
        ).fetchone()
        if agent_row is None:
            raise bad_request(
                "unknown_agent_profile_id",
                "Unknown agent_profile_id",
                {"agent_profile_id": payload.agent_profile_id},
            )

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
        raise internal_error("schedule_create_failed", "Failed to create schedule")
    return _row_to_schedule(row)


def update_schedule(
    database_path: Path,
    schedule_id: str,
    payload: ScheduleUpdate,
) -> ScheduleRead:
    fields_set = payload.model_fields_set
    updates: list[str] = []
    values: list[object] = []

    with get_connection(database_path) as connection:
        existing = connection.execute(
            "SELECT * FROM schedules WHERE id = ?",
            (schedule_id,),
        ).fetchone()
        if existing is None:
            raise not_found("schedule", schedule_id)

        workspace_id = (
            payload.workspace_id if "workspace_id" in fields_set else str(existing["workspace_id"])
        )
        agent_profile_id = (
            payload.agent_profile_id
            if "agent_profile_id" in fields_set
            else str(existing["agent_profile_id"])
        )
        mode = payload.mode if "mode" in fields_set else ScheduleMode(str(existing["mode"]))
        interval_minutes = (
            payload.interval_minutes
            if "interval_minutes" in fields_set
            else existing["interval_minutes"]
        )
        cron_expression = (
            payload.cron_expression
            if "cron_expression" in fields_set
            else existing["cron_expression"]
        )
        enabled = payload.enabled if "enabled" in fields_set else bool(existing["enabled"])

        workspace_row = connection.execute(
            "SELECT id FROM workspaces WHERE id = ?",
            (workspace_id,),
        ).fetchone()
        if workspace_row is None:
            raise bad_request(
                "unknown_workspace_id",
                "Unknown workspace_id",
                {"workspace_id": workspace_id},
            )

        agent_row = connection.execute(
            "SELECT id FROM agent_profiles WHERE id = ?",
            (agent_profile_id,),
        ).fetchone()
        if agent_row is None:
            raise bad_request(
                "unknown_agent_profile_id",
                "Unknown agent_profile_id",
                {"agent_profile_id": agent_profile_id},
            )

        _validate_schedule_shape(
            mode=mode,
            interval_minutes=interval_minutes,
            cron_expression=cron_expression,
        )
        next_run_at = _calculate_next_run(
            enabled=enabled,
            mode=mode,
            interval_minutes=interval_minutes,
        )

        if "name" in fields_set:
            updates.append("name = ?")
            values.append(payload.name)
        if "workspace_id" in fields_set:
            updates.append("workspace_id = ?")
            values.append(workspace_id)
        if "agent_profile_id" in fields_set:
            updates.append("agent_profile_id = ?")
            values.append(agent_profile_id)
        if "mode" in fields_set:
            updates.append("mode = ?")
            values.append(mode.value)
        if "interval_minutes" in fields_set:
            updates.append("interval_minutes = ?")
            values.append(interval_minutes)
        if "cron_expression" in fields_set:
            updates.append("cron_expression = ?")
            values.append(cron_expression)
        if "enabled" in fields_set:
            updates.append("enabled = ?")
            values.append(int(enabled))

        updates.append("next_run_at = ?")
        values.append(next_run_at)
        updates.append("updated_at = ?")
        values.append(utc_now_iso())
        values.append(schedule_id)
        connection.execute(
            f"UPDATE schedules SET {', '.join(updates)} WHERE id = ?",
            values,
        )

        row = connection.execute(
            "SELECT * FROM schedules WHERE id = ?",
            (schedule_id,),
        ).fetchone()

    if row is None:
        raise internal_error("schedule_update_failed", "Failed to update schedule")
    return _row_to_schedule(row)
