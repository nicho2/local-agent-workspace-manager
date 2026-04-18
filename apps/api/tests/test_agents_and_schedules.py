from datetime import datetime


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


def test_create_agent_and_interval_schedule(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)

    agent = _create_agent(client, workspace["id"])
    assert agent["runtime"] == "copilot_cli"

    schedule_response = client.post(
        "/schedules",
        json={
            "name": "nightly-triage",
            "workspace_id": workspace["id"],
            "agent_profile_id": agent["id"],
            "mode": "interval",
            "interval_minutes": 60,
            "enabled": True,
        },
    )
    assert schedule_response.status_code == 201
    schedule = schedule_response.json()
    assert schedule["mode"] == "interval"
    assert schedule["next_run_at"] is not None


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
