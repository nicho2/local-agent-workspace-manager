import json
from datetime import datetime
from pathlib import Path

from app.core.config import get_settings
from app.db.database import get_connection
from app.schemas.safety import (
    SafetyAgentSignal,
    SafetyPolicySignal,
    SafetyRunSignal,
    SafetyScheduleSignal,
    SafetySummary,
)
from app.services.settings_service import get_bool_setting


def get_safety_summary(database_path: Path) -> SafetySummary:
    settings = get_settings()

    with get_connection(database_path) as connection:
        policy_rows = connection.execute(
            """
            SELECT id, name, allow_write, allow_network, allowed_command_prefixes
            FROM workspace_policies
            WHERE allow_write = 1 OR allow_network = 1
            ORDER BY name ASC
            """
        ).fetchall()
        agent_rows = connection.execute(
            """
            SELECT a.id, a.name, a.runtime, a.workspace_id, w.name AS workspace_name
            FROM agent_profiles a
            LEFT JOIN workspaces w ON w.id = a.workspace_id
            WHERE a.is_active = 1
            ORDER BY a.name ASC
            """
        ).fetchall()
        schedule_rows = connection.execute(
            """
            SELECT
                s.id,
                s.name,
                s.mode,
                s.workspace_id,
                w.name AS workspace_name,
                s.agent_profile_id,
                a.name AS agent_name,
                s.next_run_at
            FROM schedules s
            JOIN workspaces w ON w.id = s.workspace_id
            JOIN agent_profiles a ON a.id = s.agent_profile_id
            WHERE s.enabled = 1
            ORDER BY s.next_run_at ASC, s.name ASC
            """
        ).fetchall()
        run_rows = connection.execute(
            """
            SELECT
                r.id,
                r.status,
                r.trigger,
                r.dry_run,
                r.workspace_id,
                w.name AS workspace_name,
                r.agent_profile_id,
                a.name AS agent_name,
                r.started_at
            FROM runs r
            JOIN workspaces w ON w.id = r.workspace_id
            JOIN agent_profiles a ON a.id = r.agent_profile_id
            WHERE r.status IN ('blocked', 'failed')
            ORDER BY r.started_at DESC
            LIMIT 5
            """
        ).fetchall()

    return SafetySummary(
        execution_enabled=get_bool_setting(
            database_path,
            "runner.execution_enabled",
            default=settings.execution_enabled,
        ),
        allowed_roots=[str(root) for root in settings.resolved_workspace_allowed_roots],
        permissive_policies=[
            SafetyPolicySignal(
                id=row["id"],
                name=row["name"],
                allow_write=bool(row["allow_write"]),
                allow_network=bool(row["allow_network"]),
                allowed_command_prefixes=json.loads(row["allowed_command_prefixes"]),
            )
            for row in policy_rows
        ],
        active_agents=[
            SafetyAgentSignal(
                id=row["id"],
                name=row["name"],
                runtime=row["runtime"],
                workspace_id=row["workspace_id"],
                workspace_name=row["workspace_name"],
            )
            for row in agent_rows
        ],
        active_schedules=[
            SafetyScheduleSignal(
                id=row["id"],
                name=row["name"],
                mode=row["mode"],
                workspace_id=row["workspace_id"],
                workspace_name=row["workspace_name"],
                agent_profile_id=row["agent_profile_id"],
                agent_name=row["agent_name"],
                next_run_at=(
                    datetime.fromisoformat(row["next_run_at"])
                    if row["next_run_at"]
                    else None
                ),
            )
            for row in schedule_rows
        ],
        recent_attention_runs=[
            SafetyRunSignal(
                id=row["id"],
                status=row["status"],
                trigger=row["trigger"],
                dry_run=bool(row["dry_run"]),
                workspace_id=row["workspace_id"],
                workspace_name=row["workspace_name"],
                agent_profile_id=row["agent_profile_id"],
                agent_name=row["agent_name"],
                started_at=datetime.fromisoformat(row["started_at"]),
            )
            for row in run_rows
        ],
    )
