from datetime import datetime


def _create_policy(client, name="test-policy"):
    response = client.post(
        "/policies",
        json={
            "name": name,
            "description": "Policy created by tests",
            "max_runtime_seconds": 900,
            "allow_write": False,
            "allow_network": False,
            "allowed_command_prefixes": ["python -m pytest"],
        },
    )
    assert response.status_code == 201
    return response.json()


def _create_workspace(client, workspace_root, slug="docs-vault"):
    policy_id = client.get("/policies").json()[0]["id"]
    response = client.post(
        "/workspaces",
        json={
            "name": "Docs Vault",
            "slug": slug,
            "root_path": str(workspace_root / slug),
            "description": "Workspace for documentation maintenance",
            "tags": ["docs", "vault"],
            "policy_id": policy_id,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_create_and_list_workspace(client, workspace_root):
    policies = client.get("/policies")
    assert policies.status_code == 200
    default_policy_id = policies.json()[0]["id"]
    root_path = workspace_root / "docs-vault"

    create_workspace = client.post(
        "/workspaces",
        json={
            "name": "Docs Vault",
            "slug": "docs-vault",
            "root_path": str(root_path),
            "description": "Workspace for documentation maintenance",
            "tags": ["docs", "vault"],
            "policy_id": default_policy_id,
        },
    )
    assert create_workspace.status_code == 201
    workspace = create_workspace.json()
    assert workspace["slug"] == "docs-vault"
    assert workspace["root_path"] == str(root_path.resolve())
    assert workspace["policy_id"] == default_policy_id

    listing = client.get("/workspaces")
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    detail = client.get(f"/workspaces/{workspace['id']}")
    assert detail.status_code == 200
    assert detail.json()["name"] == "Docs Vault"


def test_update_policy(client):
    policy = _create_policy(client)

    response = client.put(
        f"/policies/{policy['id']}",
        json={
            "name": "updated-policy",
            "description": "Updated policy",
            "max_runtime_seconds": 1200,
            "allow_write": True,
            "allow_network": True,
            "allowed_command_prefixes": ["python -m pytest", "npm test"],
        },
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["id"] == policy["id"]
    assert updated["name"] == "updated-policy"
    assert updated["description"] == "Updated policy"
    assert updated["max_runtime_seconds"] == 1200
    assert updated["allow_write"] is True
    assert updated["allow_network"] is True
    assert updated["allowed_command_prefixes"] == ["python -m pytest", "npm test"]
    assert datetime.fromisoformat(updated["updated_at"]).tzinfo is not None


def test_update_policy_name_conflict_returns_structured_error(client):
    first = _create_policy(client, "first-policy")
    second = _create_policy(client, "second-policy")

    response = client.put(
        f"/policies/{second['id']}",
        json={"name": first["name"]},
    )

    assert response.status_code == 409
    assert response.json() == {
        "code": "policy_name_conflict",
        "message": "Policy name already exists",
        "details": {"name": first["name"]},
    }


def test_update_policy_rejects_invalid_runtime_limit(client):
    policy = _create_policy(client)

    response = client.put(
        f"/policies/{policy['id']}",
        json={"max_runtime_seconds": 0},
    )

    assert response.status_code == 422


def test_update_policy_rejects_empty_command_prefix(client):
    policy = _create_policy(client)

    response = client.put(
        f"/policies/{policy['id']}",
        json={"allowed_command_prefixes": [""]},
    )

    assert response.status_code == 422


def test_create_workspace_with_unknown_policy_returns_structured_error(client, workspace_root):
    response = client.post(
        "/workspaces",
        json={
            "name": "Invalid Policy Workspace",
            "slug": "invalid-policy-workspace",
            "root_path": str(workspace_root / "invalid-policy-workspace"),
            "tags": [],
            "policy_id": "policy_missing",
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "code": "unknown_policy_id",
        "message": "Unknown policy_id",
        "details": {"policy_id": "policy_missing"},
    }


def test_missing_workspace_returns_structured_error(client):
    response = client.get("/workspaces/ws_missing")

    assert response.status_code == 404
    assert response.json() == {
        "code": "workspace_not_found",
        "message": "Workspace not found",
        "details": {"resource": "workspace", "id": "ws_missing"},
    }


def test_workspace_root_path_outside_allowed_roots_is_rejected(client, tmp_path):
    policy_id = client.get("/policies").json()[0]["id"]
    outside_root = tmp_path / "outside" / "docs-vault"

    response = client.post(
        "/workspaces",
        json={
            "name": "Outside Workspace",
            "slug": "outside-workspace",
            "root_path": str(outside_root),
            "tags": [],
            "policy_id": policy_id,
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "workspace_root_outside_allowed_roots"
    assert body["message"] == "Workspace root_path must be inside an allowed workspace root"
    assert body["details"]["root_path"] == str(outside_root.resolve())


def test_workspace_root_path_traversal_outside_allowed_roots_is_rejected(
    client,
    tmp_path,
    workspace_root,
):
    policy_id = client.get("/policies").json()[0]["id"]
    traversal_root = workspace_root / ".." / "escaped-workspace"

    response = client.post(
        "/workspaces",
        json={
            "name": "Traversal Workspace",
            "slug": "traversal-workspace",
            "root_path": str(traversal_root),
            "tags": [],
            "policy_id": policy_id,
        },
    )

    assert response.status_code == 400
    assert response.json()["details"]["root_path"] == str((tmp_path / "escaped-workspace").resolve())


def test_update_workspace_metadata_policy_and_root_path(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    policy_response = client.post(
        "/policies",
        json={
            "name": "editable-policy",
            "description": "Policy used by workspace update tests",
            "max_runtime_seconds": 1200,
            "allow_write": False,
            "allow_network": False,
            "allowed_command_prefixes": ["python -m pytest"],
        },
    )
    assert policy_response.status_code == 201
    policy = policy_response.json()
    updated_root = workspace_root / "docs-vault-updated"

    response = client.put(
        f"/workspaces/{workspace['id']}",
        json={
            "name": "Docs Vault Updated",
            "description": "Updated metadata",
            "tags": ["docs", "updated"],
            "root_path": str(updated_root),
            "policy_id": policy["id"],
        },
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["id"] == workspace["id"]
    assert updated["name"] == "Docs Vault Updated"
    assert updated["description"] == "Updated metadata"
    assert updated["tags"] == ["docs", "updated"]
    assert updated["root_path"] == str(updated_root.resolve())
    assert updated["policy_id"] == policy["id"]
    assert datetime.fromisoformat(updated["updated_at"]).tzinfo is not None


def test_update_workspace_with_unknown_policy_returns_structured_error(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)

    response = client.put(
        f"/workspaces/{workspace['id']}",
        json={"policy_id": "policy_missing"},
    )

    assert response.status_code == 400
    assert response.json() == {
        "code": "unknown_policy_id",
        "message": "Unknown policy_id",
        "details": {"policy_id": "policy_missing"},
    }


def test_update_workspace_with_invalid_status_is_rejected(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)

    response = client.put(
        f"/workspaces/{workspace['id']}",
        json={"status": "deleted"},
    )

    assert response.status_code == 422


def test_archive_workspace_preserves_existing_run_history(client, workspace_root):
    workspace = _create_workspace(client, workspace_root)
    agent_response = client.post(
        "/agents",
        json={
            "name": "archive-check-agent",
            "runtime": "copilot_cli",
            "workspace_id": workspace["id"],
            "command_template": "gh copilot suggest -t archive",
            "environment": {},
            "is_active": True,
        },
    )
    assert agent_response.status_code == 201
    agent = agent_response.json()
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

    archive_response = client.put(
        f"/workspaces/{workspace['id']}",
        json={"status": "archived"},
    )

    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "archived"

    preserved_run_response = client.get(f"/runs/{run['id']}")
    assert preserved_run_response.status_code == 200
    assert preserved_run_response.json()["workspace_id"] == workspace["id"]
