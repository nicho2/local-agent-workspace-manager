from datetime import datetime, timedelta, timezone

from app.core.config import get_settings
from app.db.database import get_connection
from app.services.schedule_worker_service import process_due_schedules


def _create_workspace(client, workspace_root):
    policy_id = client.get("/policies").json()[0]["id"]
    response = client.post(
        "/workspaces",
        json={
            "name": "Repo Triage",
            "slug": "repo-triage",
            "root_path": str(workspace_root / "repo-triage"),
            "tags": ["repo"],
            "policy_id": policy_id,
        },
    )
    return response.json()


def _create_agent(client, workspace_id=None, *, is_active=True, name="triage-copilot"):
    response = client.post(
        "/agents",
        json={
            "name": name,
            "runtime": "copilot_cli",
            "workspace_id": workspace_id,
            "command_template": "gh copilot suggest -t triage",
            "environment": {"CI": "false"},
            "is_active": is_active,
        },
    )
    assert response.status_code == 201
    return response.json()


def _create_interval_schedule(client, workspace_id, agent_id, *, enabled=True):
    response = client.post(
        "/schedules",
        json={
            "name": "nightly-triage",
            "workspace_id": workspace_id,
            "agent_profile_id": agent_id,
            "mode": "interval",
            "interval_minutes": 60,
            "enabled": enabled,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_create_agent_and_interval_schedule(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)

    agent = _create_agent(client, workspace["id"])
    assert agent["runtime"] == "copilot_cli"

    schedule = _create_interval_schedule(client, workspace["id"], agent["id"])
    assert schedule["mode"] == "interval"
    assert schedule["next_run_at"] is not None


def test_runtime_capability_presets_are_available(client):
    response = client.get("/agents/runtime-presets")

    assert response.status_code == 200
    presets = response.json()
    runtimes = [preset["runtime"] for preset in presets]
    assert runtimes == ["copilot_cli", "codex", "local_command"]

    copilot = presets[0]
    assert copilot["default_command_template"] == (
        'copilot --agent wiki-maintenance --autopilot --yolo '
        '--max-autopilot-continues 6 --prompt "Lance la maintenance standard du coffre"'
    )
    assert copilot["recommended_policy_prefixes"] == ["copilot --agent"]
    assert copilot["supports_dry_run"] is True
    assert copilot["requires_network_access"] is True
    assert copilot["requires_write_access"] is False
    assert copilot["environment_defaults"] == {}


def test_create_agent_accepts_local_command_runtime(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)

    response = client.post(
        "/agents",
        json={
            "name": "local-checks",
            "runtime": "local_command",
            "workspace_id": workspace["id"],
            "command_template": "python -m pytest",
            "environment": {},
            "is_active": True,
        },
    )

    assert response.status_code == 201
    assert response.json()["runtime"] == "local_command"


def test_update_agent_profile(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent = _create_agent(client, workspace["id"])

    response = client.put(
        f"/agents/{agent['id']}",
        json={
            "name": "updated-agent",
            "runtime": "codex",
            "workspace_id": None,
            "command_template": "codex run maintenance",
            "system_prompt": "Review docs",
            "environment": {"MODE": "demo"},
            "is_active": False,
        },
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["id"] == agent["id"]
    assert updated["name"] == "updated-agent"
    assert updated["runtime"] == "codex"
    assert updated["workspace_id"] is None
    assert updated["command_template"] == "codex run maintenance"
    assert updated["system_prompt"] == "Review docs"
    assert updated["environment"] == {"MODE": "demo"}
    assert updated["is_active"] is False
    assert datetime.fromisoformat(updated["updated_at"]).tzinfo is not None


def test_update_agent_with_unknown_workspace_returns_structured_error(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent = _create_agent(client, workspace["id"])

    response = client.put(
        f"/agents/{agent['id']}",
        json={"workspace_id": "ws_missing"},
    )

    assert response.status_code == 400
    assert response.json() == {
        "code": "unknown_workspace_id",
        "message": "Unknown workspace_id",
        "details": {"workspace_id": "ws_missing"},
    }


def test_update_schedule_activation_recalculates_next_run(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent = _create_agent(client, workspace["id"])
    schedule = _create_interval_schedule(client, workspace["id"], agent["id"], enabled=False)
    assert schedule["next_run_at"] is None

    response = client.put(
        f"/schedules/{schedule['id']}",
        json={"enabled": True, "interval_minutes": 30},
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["enabled"] is True
    assert updated["interval_minutes"] == 30
    assert updated["next_run_at"] is not None
    assert datetime.fromisoformat(updated["updated_at"]).tzinfo is not None


def test_update_schedule_deactivation_clears_next_run(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent = _create_agent(client, workspace["id"])
    schedule = _create_interval_schedule(client, workspace["id"], agent["id"])
    assert schedule["next_run_at"] is not None

    response = client.put(
        f"/schedules/{schedule['id']}",
        json={"enabled": False},
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["enabled"] is False
    assert updated["next_run_at"] is None


def test_update_schedule_rejects_invalid_interval(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent = _create_agent(client, workspace["id"])
    schedule = _create_interval_schedule(client, workspace["id"], agent["id"])

    response = client.put(
        f"/schedules/{schedule['id']}",
        json={"interval_minutes": 1},
    )

    assert response.status_code == 422


def test_update_schedule_rejects_unknown_references(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent = _create_agent(client, workspace["id"])
    schedule = _create_interval_schedule(client, workspace["id"], agent["id"])

    workspace_response = client.put(
        f"/schedules/{schedule['id']}",
        json={"workspace_id": "ws_missing"},
    )
    agent_response = client.put(
        f"/schedules/{schedule['id']}",
        json={"agent_profile_id": "agent_missing"},
    )

    assert workspace_response.status_code == 400
    assert workspace_response.json() == {
        "code": "unknown_workspace_id",
        "message": "Unknown workspace_id",
        "details": {"workspace_id": "ws_missing"},
    }
    assert agent_response.status_code == 400
    assert agent_response.json() == {
        "code": "unknown_agent_profile_id",
        "message": "Unknown agent_profile_id",
        "details": {"agent_profile_id": "agent_missing"},
    }


def test_schedule_worker_processes_due_interval_once(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent = _create_agent(client, workspace["id"])
    schedule = _create_interval_schedule(client, workspace["id"], agent["id"])
    database_path = get_settings().database_path
    due_at = datetime(2026, 4, 18, 8, 0, tzinfo=timezone.utc)
    now = datetime(2026, 4, 18, 9, 0, tzinfo=timezone.utc)

    with get_connection(database_path) as connection:
        connection.execute(
            "UPDATE schedules SET next_run_at = ? WHERE id = ?",
            (due_at.isoformat(), schedule["id"]),
        )

    result = process_due_schedules(database_path, now=now)

    assert result.processed_count == 1
    assert len(result.created_run_ids) == 1

    runs = client.get("/runs").json()
    assert len(runs) == 1
    assert runs[0]["id"] == result.created_run_ids[0]
    assert runs[0]["trigger"] == "schedule"
    assert runs[0]["dry_run"] is True
    assert runs[0]["status"] == "completed"

    schedules = client.get("/schedules").json()
    updated_schedule = next(item for item in schedules if item["id"] == schedule["id"])
    assert datetime.fromisoformat(updated_schedule["next_run_at"]) == now + timedelta(minutes=60)

    second_result = process_due_schedules(database_path, now=now)
    assert second_result.processed_count == 0
    assert client.get("/runs").json() == runs


def test_schedule_worker_ignores_disabled_and_not_due_schedules(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent = _create_agent(client, workspace["id"])
    disabled_schedule = _create_interval_schedule(
        client,
        workspace["id"],
        agent["id"],
        enabled=False,
    )
    future_schedule = _create_interval_schedule(client, workspace["id"], agent["id"])
    database_path = get_settings().database_path
    now = datetime(2026, 4, 18, 9, 0, tzinfo=timezone.utc)

    with get_connection(database_path) as connection:
        connection.execute(
            "UPDATE schedules SET next_run_at = ? WHERE id = ?",
            ((now - timedelta(hours=1)).isoformat(), disabled_schedule["id"]),
        )
        connection.execute(
            "UPDATE schedules SET next_run_at = ? WHERE id = ?",
            ((now + timedelta(hours=1)).isoformat(), future_schedule["id"]),
        )

    result = process_due_schedules(database_path, now=now)

    assert result.processed_count == 0
    assert result.created_run_ids == []
    assert client.get("/runs").json() == []
