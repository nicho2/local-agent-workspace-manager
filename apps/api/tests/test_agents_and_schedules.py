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


def test_create_agent_and_interval_schedule(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)

    agent_response = client.post(
        "/agents",
        json={
            "name": "triage-copilot",
            "runtime": "copilot_cli",
            "workspace_id": workspace["id"],
            "command_template": "gh copilot suggest -t triage",
            "environment": {"CI": "false"},
            "is_active": True,
        },
    )
    assert agent_response.status_code == 201
    agent = agent_response.json()
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
