from __future__ import annotations

import os
import sys
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
API_ROOT = ROOT / "apps" / "api"
EXAMPLES_ROOT = ROOT / "examples" / "workspaces"

if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.db.database import ensure_database  # noqa: E402
from app.schemas.agent import AgentProfileCreate, AgentRuntime  # noqa: E402
from app.schemas.schedule import ScheduleCreate, ScheduleMode  # noqa: E402
from app.schemas.workspace import WorkspaceCreate  # noqa: E402
from app.services.agent_service import create_agent, list_agents  # noqa: E402
from app.services.policy_service import get_default_policy_id  # noqa: E402
from app.services.schedule_service import create_schedule, list_schedules  # noqa: E402
from app.services.workspace_service import create_workspace, list_workspaces  # noqa: E402


def _configure_demo_environment() -> None:
    os.environ.setdefault("LAWM_WORKSPACE_ROOT", str(EXAMPLES_ROOT))
    os.environ.setdefault("LAWM_WORKSPACE_ALLOWED_ROOTS", json.dumps([str(EXAMPLES_ROOT)]))
    get_settings.cache_clear()


def _ensure_example_directories() -> None:
    for relative in ["demo-maintenance", "repo-triage"]:
        (EXAMPLES_ROOT / relative).mkdir(parents=True, exist_ok=True)


def _ensure_workspace(
    *,
    name: str,
    slug: str,
    description: str,
    tags: list[str],
    policy_id: str,
) -> str:
    settings = get_settings()
    existing = next(
        (workspace for workspace in list_workspaces(settings.database_path) if workspace.slug == slug),
        None,
    )
    if existing is not None:
        return existing.id

    workspace = create_workspace(
        settings.database_path,
        WorkspaceCreate(
            name=name,
            slug=slug,
            root_path=str(EXAMPLES_ROOT / slug),
            description=description,
            tags=tags,
            policy_id=policy_id,
        ),
    )
    return workspace.id


def _ensure_agent(
    *,
    name: str,
    workspace_id: str,
    command_template: str,
    system_prompt: str,
) -> str:
    settings = get_settings()
    existing = next(
        (
            agent
            for agent in list_agents(settings.database_path)
            if agent.name == name and agent.workspace_id == workspace_id
        ),
        None,
    )
    if existing is not None:
        return existing.id

    agent = create_agent(
        settings.database_path,
        AgentProfileCreate(
            name=name,
            runtime=AgentRuntime.copilot_cli,
            workspace_id=workspace_id,
            command_template=command_template,
            system_prompt=system_prompt,
            environment={"CI": "false"},
            is_active=True,
        ),
    )
    return agent.id


def _ensure_interval_schedule(
    *,
    name: str,
    workspace_id: str,
    agent_profile_id: str,
    interval_minutes: int,
    enabled: bool,
) -> str:
    settings = get_settings()
    existing = next(
        (
            schedule
            for schedule in list_schedules(settings.database_path)
            if schedule.name == name
            and schedule.workspace_id == workspace_id
            and schedule.agent_profile_id == agent_profile_id
        ),
        None,
    )
    if existing is not None:
        return existing.id

    schedule = create_schedule(
        settings.database_path,
        ScheduleCreate(
            name=name,
            workspace_id=workspace_id,
            agent_profile_id=agent_profile_id,
            mode=ScheduleMode.interval,
            interval_minutes=interval_minutes,
            enabled=enabled,
        ),
    )
    return schedule.id


def seed_demo() -> dict[str, list[str]]:
    _configure_demo_environment()
    _ensure_example_directories()

    settings = get_settings()
    ensure_database(
        settings.database_path,
        execution_enabled_default=settings.execution_enabled,
    )
    policy_id = get_default_policy_id(settings.database_path)

    maintenance_workspace_id = _ensure_workspace(
        name="Demo Maintenance",
        slug="demo-maintenance",
        description="Documentation or vault maintenance demo workspace.",
        tags=["demo", "maintenance"],
        policy_id=policy_id,
    )
    triage_workspace_id = _ensure_workspace(
        name="Repo Triage",
        slug="repo-triage",
        description="Repository triage demo workspace.",
        tags=["demo", "repo"],
        policy_id=policy_id,
    )

    maintenance_agent_id = _ensure_agent(
        name="maintenance-copilot",
        workspace_id=maintenance_workspace_id,
        command_template="gh copilot suggest -t maintenance",
        system_prompt="Review the workspace and propose maintenance actions.",
    )
    triage_agent_id = _ensure_agent(
        name="repo-triage-copilot",
        workspace_id=triage_workspace_id,
        command_template="gh copilot suggest -t triage",
        system_prompt="Review repository signals and propose triage actions.",
    )

    maintenance_schedule_id = _ensure_interval_schedule(
        name="daily-maintenance-demo",
        workspace_id=maintenance_workspace_id,
        agent_profile_id=maintenance_agent_id,
        interval_minutes=1440,
        enabled=False,
    )
    triage_schedule_id = _ensure_interval_schedule(
        name="hourly-triage-demo",
        workspace_id=triage_workspace_id,
        agent_profile_id=triage_agent_id,
        interval_minutes=60,
        enabled=False,
    )

    return {
        "agents": [maintenance_agent_id, triage_agent_id],
        "policies": [policy_id],
        "schedules": [maintenance_schedule_id, triage_schedule_id],
        "workspaces": [maintenance_workspace_id, triage_workspace_id],
    }


def main() -> None:
    result = seed_demo()
    print("Demo seed ready.")
    for key, ids in result.items():
        print(f"{key}: {', '.join(ids)}")


if __name__ == "__main__":
    main()
