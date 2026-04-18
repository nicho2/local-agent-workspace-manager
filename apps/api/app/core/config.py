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
    workspace_allowed_roots: list[Path] = Field(
        default_factory=lambda: [REPO_ROOT / "examples" / "workspaces"]
    )
    logs_root: Path = Field(default=REPO_ROOT / "storage" / "logs")
    artifacts_root: Path = Field(default=REPO_ROOT / "storage" / "artifacts")
    cors_allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )
    schedule_worker_enabled: bool = False
    schedule_worker_poll_seconds: int = Field(default=60, ge=5, le=3600)

    @property
    def resolved_workspace_allowed_roots(self) -> tuple[Path, ...]:
        return tuple(
            allowed_root.expanduser().resolve() for allowed_root in self.workspace_allowed_roots
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
