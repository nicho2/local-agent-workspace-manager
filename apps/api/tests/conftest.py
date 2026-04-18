import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


@pytest.fixture
def workspace_root(tmp_path: Path) -> Path:
    return tmp_path / "workspaces"


@pytest.fixture
def client(tmp_path: Path, workspace_root: Path):
    with _create_test_client(
        tmp_path,
        workspace_root,
        execution_enabled=False,
    ) as test_client:
        yield test_client
    get_settings.cache_clear()


@pytest.fixture
def client_execution_enabled(tmp_path: Path, workspace_root: Path):
    with _create_test_client(
        tmp_path,
        workspace_root,
        execution_enabled=True,
    ) as test_client:
        yield test_client
    get_settings.cache_clear()


def _create_test_client(
    tmp_path: Path,
    workspace_root: Path,
    *,
    execution_enabled: bool,
) -> TestClient:
    os.environ["LAWM_DATABASE_PATH"] = str(tmp_path / "test.db")
    os.environ["LAWM_WORKSPACE_ROOT"] = str(workspace_root)
    os.environ["LAWM_WORKSPACE_ALLOWED_ROOTS"] = json.dumps([str(workspace_root)])
    os.environ["LAWM_LOGS_ROOT"] = str(tmp_path / "logs")
    os.environ["LAWM_ARTIFACTS_ROOT"] = str(tmp_path / "artifacts")
    os.environ["LAWM_EXECUTION_ENABLED"] = "true" if execution_enabled else "false"
    get_settings.cache_clear()

    app = create_app()
    return TestClient(app)
