import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


SCHEMA = '''
CREATE TABLE IF NOT EXISTS workspace_policies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    max_runtime_seconds INTEGER NOT NULL,
    allow_write INTEGER NOT NULL,
    allow_network INTEGER NOT NULL,
    allowed_command_prefixes TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    root_path TEXT NOT NULL,
    description TEXT,
    tags TEXT NOT NULL,
    status TEXT NOT NULL,
    policy_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(policy_id) REFERENCES workspace_policies(id)
);

CREATE TABLE IF NOT EXISTS agent_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    runtime TEXT NOT NULL,
    workspace_id TEXT,
    command_template TEXT NOT NULL,
    system_prompt TEXT,
    environment TEXT NOT NULL,
    is_active INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    agent_profile_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    interval_minutes INTEGER,
    cron_expression TEXT,
    enabled INTEGER NOT NULL,
    next_run_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY(agent_profile_id) REFERENCES agent_profiles(id)
);

CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    agent_profile_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    status TEXT NOT NULL,
    dry_run INTEGER NOT NULL,
    requested_by TEXT NOT NULL,
    command_preview TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY(agent_profile_id) REFERENCES agent_profiles(id)
);

CREATE TABLE IF NOT EXISTS run_logs (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(run_id) REFERENCES runs(id)
);

CREATE TABLE IF NOT EXISTS run_artifacts (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    name TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    media_type TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(run_id) REFERENCES runs(id)
);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
'''


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def ensure_database(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database_path) as connection:
        connection.executescript(SCHEMA)
        seed_defaults(connection)
        connection.commit()


def seed_defaults(connection: sqlite3.Connection) -> None:
    now = utc_now_iso()

    connection.execute(
        '''
        INSERT OR IGNORE INTO workspace_policies (
            id, name, description, max_runtime_seconds, allow_write,
            allow_network, allowed_command_prefixes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        (
            "policy_default_safe",
            "default-safe",
            "Safe default policy with dry-run-first posture.",
            900,
            0,
            0,
            json.dumps(["gh copilot", "python -m pytest", "npm test"]),
            now,
            now,
        ),
    )

    defaults = [
        ("runner.execution_enabled", "false", "Global switch for real command execution."),
        ("storage.retention_days", "30", "Default retention period for run artifacts."),
        ("ui.compact_mode", "true", "Compact mode preference for the web UI."),
    ]

    for key, value, description in defaults:
        connection.execute(
            '''
            INSERT OR IGNORE INTO system_settings (key, value, description, updated_at)
            VALUES (?, ?, ?, ?)
            ''',
            (key, value, description, now),
        )


@contextmanager
def get_connection(database_path: Path) -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()
