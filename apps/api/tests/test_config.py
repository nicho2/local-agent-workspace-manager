import json
from pathlib import Path

from pytest import MonkeyPatch

from app.core.config import REPO_ROOT, Settings


def test_settings_use_repository_root_env_file() -> None:
    assert Settings.model_config["env_file"] == REPO_ROOT / ".env"


def test_settings_load_multiple_workspace_allowed_roots(
    monkeypatch: MonkeyPatch,
) -> None:
    first_root = Path("C:/lawm/examples/workspaces")
    second_root = Path("E:/temp")
    monkeypatch.setenv(
        "LAWM_WORKSPACE_ALLOWED_ROOTS",
        json.dumps([str(first_root), str(second_root)]),
    )

    settings = Settings()

    assert settings.resolved_workspace_allowed_roots == (
        first_root.resolve(),
        second_root.resolve(),
    )


def test_settings_resolve_relative_paths_from_repository_root(
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setenv("LAWM_DATABASE_PATH", "./storage/sqlite/test.db")
    monkeypatch.setenv("LAWM_WORKSPACE_ROOT", "./examples/workspaces")
    monkeypatch.setenv("LAWM_WORKSPACE_ALLOWED_ROOTS", '["./examples/workspaces","E:/temp"]')
    monkeypatch.setenv("LAWM_LOGS_ROOT", "./storage/logs")
    monkeypatch.setenv("LAWM_ARTIFACTS_ROOT", "./storage/artifacts")

    settings = Settings()

    assert settings.database_path == REPO_ROOT / "storage" / "sqlite" / "test.db"
    assert settings.workspace_root == REPO_ROOT / "examples" / "workspaces"
    assert settings.workspace_allowed_roots == [
        REPO_ROOT / "examples" / "workspaces",
        Path("E:/temp"),
    ]
    assert settings.logs_root == REPO_ROOT / "storage" / "logs"
    assert settings.artifacts_root == REPO_ROOT / "storage" / "artifacts"
