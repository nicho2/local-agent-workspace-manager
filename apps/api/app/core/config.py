from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LAWM_", extra="ignore")

    app_name: str = "Local Agent Workspace Manager API"
    environment: str = "dev"
    database_path: Path = Field(default=REPO_ROOT / "storage" / "sqlite" / "lawm.db")
    execution_enabled: bool = False
    workspace_root: Path = Field(default=REPO_ROOT / "examples" / "workspaces")
    logs_root: Path = Field(default=REPO_ROOT / "storage" / "logs")
    artifacts_root: Path = Field(default=REPO_ROOT / "storage" / "artifacts")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
