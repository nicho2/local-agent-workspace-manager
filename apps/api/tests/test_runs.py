from datetime import datetime


def _create_workspace(client, workspace_root, slug="maintenance"):
    policy_id = client.get("/policies").json()[0]["id"]
    response = client.post(
        "/workspaces",
        json={
            "name": f"Workspace {slug}",
            "slug": slug,
            "root_path": str(workspace_root / slug),
            "tags": ["ops"],
            "policy_id": policy_id,
        },
    )
    assert response.status_code == 201
    return response.json()


def _create_agent(client, workspace_id=None, *, is_active=True, name="maintenance-agent"):
    response = client.post(
        "/agents",
        json={
            "name": name,
            "runtime": "copilot_cli",
            "workspace_id": workspace_id,
            "command_template": "gh copilot suggest -t maintenance",
            "environment": {},
            "is_active": is_active,
        },
    )
    assert response.status_code == 201
    return response.json()


def _bootstrap_workspace_and_agent(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent = _create_agent(client, workspace["id"])
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
    logs = logs_response.json()
    assert len(logs) >= 2
    log_timestamps = [datetime.fromisoformat(log["timestamp"]) for log in logs]
    assert log_timestamps == sorted(log_timestamps)

    artifacts_response = client.get(f"/runs/{run['id']}/artifacts")
    assert artifacts_response.status_code == 200
    artifacts = artifacts_response.json()
    assert len(artifacts) == 1
    assert artifacts[0]["name"] == "summary.md"
    assert artifacts[0]["relative_path"].endswith("summary.md")
    assert artifacts[0]["media_type"] == "text/markdown"


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


def test_inactive_agent_cannot_start_run(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent = _create_agent(client, workspace["id"], is_active=False)

    response = client.post(
        "/runs",
        json={
            "workspace_id": workspace["id"],
            "agent_profile_id": agent["id"],
            "dry_run": True,
            "requested_by": "pytest",
        },
    )

    assert response.status_code == 409
    assert response.json() == {
        "code": "agent_profile_inactive",
        "message": "Agent profile is inactive",
        "details": {"agent_profile_id": agent["id"]},
    }


def test_workspace_bound_agent_cannot_start_run_for_other_workspace(client, workspace_root):
    first_workspace = _create_workspace(client, workspace_root, "first-workspace")
    second_workspace = _create_workspace(client, workspace_root, "second-workspace")
    agent = _create_agent(client, first_workspace["id"])

    response = client.post(
        "/runs",
        json={
            "workspace_id": second_workspace["id"],
            "agent_profile_id": agent["id"],
            "dry_run": True,
            "requested_by": "pytest",
        },
    )

    assert response.status_code == 409
    assert response.json() == {
        "code": "agent_workspace_mismatch",
        "message": "Agent profile is bound to a different workspace",
        "details": {
            "agent_profile_id": agent["id"],
            "agent_workspace_id": first_workspace["id"],
            "workspace_id": second_workspace["id"],
        },
    }


def test_global_agent_can_start_run_for_any_workspace(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent = _create_agent(client, workspace_id=None)

    response = client.post(
        "/runs",
        json={
            "workspace_id": workspace["id"],
            "agent_profile_id": agent["id"],
            "dry_run": True,
            "requested_by": "pytest",
        },
    )

    assert response.status_code == 201
    assert response.json()["agent_profile_id"] == agent["id"]


def test_missing_run_detail_logs_and_artifacts_return_structured_404(client):
    expected = {
        "code": "run_not_found",
        "message": "Run not found",
        "details": {"resource": "run", "id": "run_missing"},
    }

    detail_response = client.get("/runs/run_missing")
    logs_response = client.get("/runs/run_missing/logs")
    artifacts_response = client.get("/runs/run_missing/artifacts")

    assert detail_response.status_code == 404
    assert logs_response.status_code == 404
    assert artifacts_response.status_code == 404
    assert detail_response.json() == expected
    assert logs_response.json() == expected
    assert artifacts_response.json() == expected
