from datetime import datetime


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


def test_runner_execution_setting_updates_dashboard(client):
    settings = client.get("/settings").json()
    runner_setting = next(
        setting for setting in settings if setting["key"] == "runner.execution_enabled"
    )
    original_updated_at = datetime.fromisoformat(runner_setting["updated_at"])

    update = client.put(
        "/settings/runner.execution_enabled",
        json={"value": "true"},
    )
    assert update.status_code == 200
    updated = update.json()
    assert updated["value"] == "true"
    assert datetime.fromisoformat(updated["updated_at"]) >= original_updated_at

    dashboard = client.get("/dashboard/summary")
    assert dashboard.status_code == 200
    assert dashboard.json()["execution_enabled"] is True


def test_unknown_setting_returns_structured_404(client):
    response = client.put(
        "/settings/runner.missing",
        json={"value": "true"},
    )

    assert response.status_code == 404
    assert response.json() == {
        "code": "setting_not_found",
        "message": "Setting not found",
        "details": {"resource": "setting", "id": "runner.missing"},
    }
