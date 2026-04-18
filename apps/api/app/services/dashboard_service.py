from pathlib import Path

from app.db.database import get_connection
from app.schemas.dashboard import DashboardSummary
from app.services.run_service import list_runs
from app.services.settings_service import get_bool_setting


def get_dashboard_summary(database_path: Path) -> DashboardSummary:
    with get_connection(database_path) as connection:
        workspaces = int(connection.execute("SELECT COUNT(*) FROM workspaces").fetchone()[0])
        agents = int(connection.execute("SELECT COUNT(*) FROM agent_profiles").fetchone()[0])
        enabled_schedules = int(
            connection.execute(
                "SELECT COUNT(*) FROM schedules WHERE enabled = 1"
            ).fetchone()[0]
        )

    return DashboardSummary(
        workspaces=workspaces,
        agents=agents,
        enabled_schedules=enabled_schedules,
        recent_runs=list_runs(database_path)[:5],
        execution_enabled=get_bool_setting(database_path, "runner.execution_enabled"),
    )
