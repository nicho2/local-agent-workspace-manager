import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    os.environ["LAWM_DATABASE_PATH"] = str(tmp_path / "test.db")
    os.environ["LAWM_WORKSPACE_ROOT"] = str(tmp_path / "workspaces")
    os.environ["LAWM_LOGS_ROOT"] = str(tmp_path / "logs")
    os.environ["LAWM_ARTIFACTS_ROOT"] = str(tmp_path / "artifacts")
    os.environ["LAWM_EXECUTION_ENABLED"] = "false"
    get_settings.cache_clear()

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client

    get_settings.cache_clear()
