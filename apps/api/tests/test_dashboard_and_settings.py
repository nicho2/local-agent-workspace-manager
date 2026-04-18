def test_dashboard_and_settings(client):
    dashboard = client.get("/dashboard/summary")
    assert dashboard.status_code == 200
    summary = dashboard.json()
    assert summary["workspaces"] == 0
    assert summary["execution_enabled"] is False

    settings = client.get("/settings")
    assert settings.status_code == 200
    assert len(settings.json()) >= 1

    update = client.put(
        "/settings/ui.compact_mode",
        json={"value": "false"},
    )
    assert update.status_code == 200
    assert update.json()["value"] == "false"
