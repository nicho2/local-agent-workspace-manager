def _create_policy(
    client,
    *,
    allow_write=False,
    allow_network=False,
    name="safety-policy",
):
    response = client.post(
        "/policies",
        json={
            "name": name,
            "description": "Policy created by safety tests",
            "max_runtime_seconds": 900,
            "allow_write": allow_write,
            "allow_network": allow_network,
            "allowed_command_prefixes": ["copilot"],
        },
    )
    assert response.status_code == 201
    return response.json()


def _create_workspace(client, workspace_root, policy_id, slug="safety-workspace"):
    response = client.post(
        "/workspaces",
        json={
            "name": "Safety Workspace",
            "slug": slug,
            "root_path": str(workspace_root / slug),
            "tags": ["safety"],
            "policy_id": policy_id,
        },
    )
    assert response.status_code == 201
    return response.json()


def _create_agent(client, workspace_id, *, command_template="copilot --agent audit"):
    response = client.post(
        "/agents",
        json={
            "name": "safety-agent",
            "runtime": "copilot_cli",
            "workspace_id": workspace_id,
            "command_template": command_template,
            "environment": {},
            "is_active": True,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_safety_summary_nominal_state_is_read_only(client, workspace_root):
    response = client.get("/safety/summary")

    assert response.status_code == 200
    summary = response.json()
    assert summary["execution_enabled"] is False
    assert summary["allowed_roots"] == [str(workspace_root.resolve())]
    assert summary["permissive_policies"] == []
    assert summary["active_agents"] == []
    assert summary["active_schedules"] == []
    assert summary["recent_attention_runs"] == []


def test_safety_summary_surfaces_security_attention_items(client, workspace_root):
    policy = _create_policy(client, allow_write=True, allow_network=True)
    workspace = _create_workspace(client, workspace_root, policy["id"])
    agent = _create_agent(client, workspace["id"])
    schedule_response = client.post(
        "/schedules",
        json={
            "name": "safety-schedule",
            "workspace_id": workspace["id"],
            "agent_profile_id": agent["id"],
            "mode": "interval",
            "interval_minutes": 30,
            "enabled": True,
        },
    )
    assert schedule_response.status_code == 201
    run_response = client.post(
        "/runs",
        json={
            "workspace_id": workspace["id"],
            "agent_profile_id": agent["id"],
            "dry_run": False,
            "requested_by": "pytest",
        },
    )
    assert run_response.status_code == 201

    response = client.get("/safety/summary")

    assert response.status_code == 200
    summary = response.json()
    assert summary["permissive_policies"] == [
        {
            "id": policy["id"],
            "name": "safety-policy",
            "allow_write": True,
            "allow_network": True,
            "allowed_command_prefixes": ["copilot"],
        }
    ]
    assert summary["active_agents"][0]["id"] == agent["id"]
    assert summary["active_agents"][0]["workspace_name"] == workspace["name"]
    assert summary["active_schedules"][0]["name"] == "safety-schedule"
    assert summary["active_schedules"][0]["workspace_name"] == workspace["name"]
    assert summary["active_schedules"][0]["agent_name"] == agent["name"]
    assert summary["recent_attention_runs"][0]["id"] == run_response.json()["id"]
    assert summary["recent_attention_runs"][0]["status"] == "blocked"
    assert summary["recent_attention_runs"][0]["workspace_name"] == workspace["name"]
