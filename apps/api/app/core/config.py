from functools import lru_cache
from pathlib import Path, PureWindowsPath
from typing import Self

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_prefix="LAWM_",
        extra="ignore",
    )

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

    @model_validator(mode="after")
    def resolve_relative_paths_from_repo_root(self) -> Self:
        self.database_path = self._repo_relative_path(self.database_path)
        self.workspace_root = self._repo_relative_path(self.workspace_root)
        self.workspace_allowed_roots = [
            self._repo_relative_path(allowed_root)
            for allowed_root in self.workspace_allowed_roots
        ]
        self.logs_root = self._repo_relative_path(self.logs_root)
        self.artifacts_root = self._repo_relative_path(self.artifacts_root)
        return self

    @property
    def resolved_workspace_allowed_roots(self) -> tuple[Path, ...]:
        return tuple(
            allowed_root.expanduser().resolve() for allowed_root in self.workspace_allowed_roots
        )

    @staticmethod
    def _repo_relative_path(path: Path) -> Path:
        expanded_path = path.expanduser()
        if expanded_path.is_absolute() or PureWindowsPath(expanded_path).drive:
            return expanded_path
        return REPO_ROOT / expanded_path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
