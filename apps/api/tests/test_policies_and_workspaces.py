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
