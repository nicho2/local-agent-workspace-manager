import json
import sys
from pathlib import Path

from app.core.config import get_settings
from app.services.agent_service import list_agents
from app.services.schedule_service import list_schedules
from app.services.workspace_service import list_workspaces


ROOT = Path(__file__).resolve().parents[3]
SCRIPTS_ROOT = ROOT / "scripts"
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))

from seed_demo import seed_demo  # noqa: E402


def test_seed_demo_is_idempotent(tmp_path, monkeypatch):
    workspace_root = ROOT / "examples" / "workspaces"
    monkeypatch.setenv("LAWM_DATABASE_PATH", str(tmp_path / "seed-demo.db"))
    monkeypatch.setenv("LAWM_WORKSPACE_ROOT", str(workspace_root))
    monkeypatch.setenv("LAWM_WORKSPACE_ALLOWED_ROOTS", json.dumps([str(workspace_root)]))
    monkeypatch.setenv("LAWM_LOGS_ROOT", str(tmp_path / "logs"))
    monkeypatch.setenv("LAWM_ARTIFACTS_ROOT", str(tmp_path / "artifacts"))
    get_settings.cache_clear()

    first = seed_demo()
    second = seed_demo()
    settings = get_settings()

    workspaces = list_workspaces(settings.database_path)
    agents = list_agents(settings.database_path)
    schedules = list_schedules(settings.database_path)

    assert first == second
    assert sorted(workspace.slug for workspace in workspaces) == [
        "demo-maintenance",
        "repo-triage",
    ]
    assert sorted(agent.name for agent in agents) == [
        "maintenance-copilot",
        "repo-triage-copilot",
    ]
    assert sorted(schedule.name for schedule in schedules) == [
        "daily-maintenance-demo",
        "hourly-triage-demo",
    ]
    assert all(not schedule.enabled for schedule in schedules)
    get_settings.cache_clear()
