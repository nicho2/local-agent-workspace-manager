def test_create_and_list_workspace(client):
    policies = client.get("/policies")
    assert policies.status_code == 200
    default_policy_id = policies.json()[0]["id"]

    create_workspace = client.post(
        "/workspaces",
        json={
            "name": "Docs Vault",
            "slug": "docs-vault",
            "root_path": "/tmp/docs-vault",
            "description": "Workspace for documentation maintenance",
            "tags": ["docs", "vault"],
            "policy_id": default_policy_id,
        },
    )
    assert create_workspace.status_code == 201
    workspace = create_workspace.json()
    assert workspace["slug"] == "docs-vault"
    assert workspace["policy_id"] == default_policy_id

    listing = client.get("/workspaces")
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    detail = client.get(f"/workspaces/{workspace['id']}")
    assert detail.status_code == 200
    assert detail.json()["name"] == "Docs Vault"
