import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app
from app.services.schedule_worker_service import process_due_schedules


ROOT = Path(__file__).resolve().parents[3]
SCRIPTS_ROOT = ROOT / "scripts"
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))

from seed_demo import seed_demo  # noqa: E402


def test_seeded_mvp_success_path(tmp_path, monkeypatch):
    workspace_root = ROOT / "examples" / "workspaces"
    monkeypatch.setenv("LAWM_DATABASE_PATH", str(tmp_path / "mvp-flow.db"))
    monkeypatch.setenv("LAWM_WORKSPACE_ROOT", str(workspace_root))
    monkeypatch.setenv("LAWM_WORKSPACE_ALLOWED_ROOTS", json.dumps([str(workspace_root)]))
    monkeypatch.setenv("LAWM_LOGS_ROOT", str(tmp_path / "logs"))
    monkeypatch.setenv("LAWM_ARTIFACTS_ROOT", str(tmp_path / "artifacts"))
    monkeypatch.setenv("LAWM_EXECUTION_ENABLED", "false")
    get_settings.cache_clear()

    seed_demo()

    with TestClient(create_app()) as client:
        workspaces = client.get("/workspaces")
        agents = client.get("/agents")
        schedules = client.get("/schedules")
        dashboard = client.get("/dashboard/summary")

        assert workspaces.status_code == 200
        assert agents.status_code == 200
        assert schedules.status_code == 200
        assert dashboard.status_code == 200
        assert len(workspaces.json()) == 2
        assert len(agents.json()) == 2
        assert len(schedules.json()) == 2
        assert all(not schedule["enabled"] for schedule in schedules.json())
        assert all(schedule["next_run_at"] is None for schedule in schedules.json())
        assert dashboard.json()["execution_enabled"] is False

        workspace = next(item for item in workspaces.json() if item["slug"] == "demo-maintenance")
        agent = next(item for item in agents.json() if item["workspace_id"] == workspace["id"])
        run_response = client.post(
            "/runs",
            json={
                "workspace_id": workspace["id"],
                "agent_profile_id": agent["id"],
                "dry_run": True,
                "requested_by": "mvp-flow-test",
            },
        )
        assert run_response.status_code == 201
        run = run_response.json()
        assert run["status"] == "completed"
        assert run["trigger"] == "manual"
        assert run["dry_run"] is True

        logs = client.get(f"/runs/{run['id']}/logs")
        artifacts = client.get(f"/runs/{run['id']}/artifacts")
        assert logs.status_code == 200
        assert artifacts.status_code == 200
        assert any("Simulation complete" in log["message"] for log in logs.json())
        assert artifacts.json()[0]["name"] == "summary.md"
        assert artifacts.json()[0]["relative_path"].endswith("summary.md")

        after_run_dashboard = client.get("/dashboard/summary").json()
        assert after_run_dashboard["recent_runs"][0]["id"] == run["id"]

        worker_result = process_due_schedules(
            get_settings().database_path,
            now=datetime(2026, 4, 18, 12, 0, tzinfo=timezone.utc),
        )
        assert worker_result.processed_count == 0
        assert len(client.get("/runs").json()) == 1

    get_settings.cache_clear()
