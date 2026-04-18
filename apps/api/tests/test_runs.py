def _bootstrap_workspace_and_agent(client, workspace_root):
    policy_id = client.get("/policies").json()[0]["id"]
    workspace = client.post(
        "/workspaces",
        json={
            "name": "Maintenance",
            "slug": "maintenance",
            "root_path": str(workspace_root / "maintenance"),
            "tags": ["ops"],
            "policy_id": policy_id,
        },
    ).json()
    agent = client.post(
        "/agents",
        json={
            "name": "maintenance-agent",
            "runtime": "copilot_cli",
            "workspace_id": workspace["id"],
            "command_template": "gh copilot suggest -t maintenance",
            "environment": {},
            "is_active": True,
        },
    ).json()
    return workspace, agent


def test_create_dry_run_and_fetch_logs_artifacts(client, workspace_root):
    workspace, agent = _bootstrap_workspace_and_agent(client, workspace_root)

    run_response = client.post(
        "/runs",
        json={
            "workspace_id": workspace["id"],
            "agent_profile_id": agent["id"],
            "dry_run": True,
            "requested_by": "pytest",
        },
    )
    assert run_response.status_code == 201
    run = run_response.json()
    assert run["status"] == "completed"
    assert run["dry_run"] is True

    logs_response = client.get(f"/runs/{run['id']}/logs")
    assert logs_response.status_code == 200
    assert len(logs_response.json()) >= 2

    artifacts_response = client.get(f"/runs/{run['id']}/artifacts")
    assert artifacts_response.status_code == 200
    artifacts = artifacts_response.json()
    assert len(artifacts) == 1
    assert artifacts[0]["name"] == "summary.md"


def test_real_execution_rejected_when_globally_disabled(client, workspace_root):
    workspace, agent = _bootstrap_workspace_and_agent(client, workspace_root)

    response = client.post(
        "/runs",
        json={
            "workspace_id": workspace["id"],
            "agent_profile_id": agent["id"],
            "dry_run": False,
            "requested_by": "pytest",
        },
    )
    assert response.status_code == 409
    assert response.json() == {
        "code": "real_execution_disabled",
        "message": "Real execution is disabled globally; use dry_run=true",
        "details": {"setting": "execution_enabled", "dry_run": False},
    }
