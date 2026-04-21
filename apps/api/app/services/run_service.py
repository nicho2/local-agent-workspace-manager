import json
import threading
from datetime import datetime
from pathlib import Path
from sqlite3 import Connection
from uuid import uuid4

from app.core.config import get_settings
from app.core.errors import bad_request, conflict, internal_error, not_found
from app.db.database import get_connection, utc_now_iso
from app.schemas.run import RunArtifactRead, RunCreate, RunLogRead, RunPreviewRead, RunRead, RunStatus
from app.services.runner_service import (
    get_command_blocking_reason,
    run_controlled_command_streaming,
)
from app.services.settings_service import get_bool_setting


def _row_to_run(row: object) -> RunRead:
    assert isinstance(row, dict) or hasattr(row, "__getitem__")
    finished_at = row["finished_at"]
    return RunRead(
        id=row["id"],
        workspace_id=row["workspace_id"],
        agent_profile_id=row["agent_profile_id"],
        trigger=row["trigger"],
        status=row["status"],
        dry_run=bool(row["dry_run"]),
        requested_by=row["requested_by"],
        command_preview=row["command_preview"],
        started_at=datetime.fromisoformat(row["started_at"]),
        finished_at=datetime.fromisoformat(finished_at) if finished_at else None,
        exit_code=row["exit_code"],
    )


def _row_to_log(row: object) -> RunLogRead:
    assert isinstance(row, dict) or hasattr(row, "__getitem__")
    return RunLogRead(
        id=row["id"],
        run_id=row["run_id"],
        level=row["level"],
        message=row["message"],
        timestamp=datetime.fromisoformat(row["timestamp"]),
    )


def _row_to_artifact(row: object) -> RunArtifactRead:
    assert isinstance(row, dict) or hasattr(row, "__getitem__")
    return RunArtifactRead(
        id=row["id"],
        run_id=row["run_id"],
        name=row["name"],
        relative_path=row["relative_path"],
        media_type=row["media_type"],
        created_at=datetime.fromisoformat(row["created_at"]),
    )


def list_runs(database_path: Path) -> list[RunRead]:
    with get_connection(database_path) as connection:
        rows = connection.execute(
            "SELECT * FROM runs ORDER BY started_at DESC LIMIT 20"
        ).fetchall()
    return [_row_to_run(row) for row in rows]


def get_run(database_path: Path, run_id: str) -> RunRead:
    with get_connection(database_path) as connection:
        row = connection.execute(
            "SELECT * FROM runs WHERE id = ?",
            (run_id,),
        ).fetchone()
    if row is None:
        raise not_found("run", run_id)
    return _row_to_run(row)


def _ensure_run_exists(connection: Connection, run_id: str) -> None:
    row = connection.execute(
        "SELECT id FROM runs WHERE id = ?",
        (run_id,),
    ).fetchone()
    if row is None:
        raise not_found("run", run_id)


def list_run_logs(database_path: Path, run_id: str) -> list[RunLogRead]:
    with get_connection(database_path) as connection:
        _ensure_run_exists(connection, run_id)
        rows = connection.execute(
            "SELECT * FROM run_logs WHERE run_id = ? ORDER BY timestamp ASC, rowid ASC",
            (run_id,),
        ).fetchall()
    return [_row_to_log(row) for row in rows]


def list_run_artifacts(database_path: Path, run_id: str) -> list[RunArtifactRead]:
    with get_connection(database_path) as connection:
        _ensure_run_exists(connection, run_id)
        rows = connection.execute(
            "SELECT * FROM run_artifacts WHERE run_id = ? ORDER BY created_at ASC",
            (run_id,),
        ).fetchall()
    return [_row_to_artifact(row) for row in rows]


def preview_run(database_path: Path, payload: RunCreate) -> RunPreviewRead:
    settings = get_settings()

    with get_connection(database_path) as connection:
        workspace_row = connection.execute(
            "SELECT * FROM workspaces WHERE id = ?",
            (payload.workspace_id,),
        ).fetchone()
        if workspace_row is None:
            raise bad_request(
                "unknown_workspace_id",
                "Unknown workspace_id",
                {"workspace_id": payload.workspace_id},
            )

        agent_row = connection.execute(
            "SELECT * FROM agent_profiles WHERE id = ?",
            (payload.agent_profile_id,),
        ).fetchone()
        if agent_row is None:
            raise bad_request(
                "unknown_agent_profile_id",
                "Unknown agent_profile_id",
                {"agent_profile_id": payload.agent_profile_id},
            )
        if not bool(agent_row["is_active"]):
            raise conflict(
                "agent_profile_inactive",
                "Agent profile is inactive",
                {"agent_profile_id": payload.agent_profile_id},
            )
        if agent_row["workspace_id"] is not None and agent_row["workspace_id"] != payload.workspace_id:
            raise conflict(
                "agent_workspace_mismatch",
                "Agent profile is bound to a different workspace",
                {
                    "agent_profile_id": payload.agent_profile_id,
                    "agent_workspace_id": str(agent_row["workspace_id"]),
                    "workspace_id": payload.workspace_id,
                },
            )

        policy_row = connection.execute(
            "SELECT * FROM workspace_policies WHERE id = ?",
            (workspace_row["policy_id"],),
        ).fetchone()
        if policy_row is None:
            raise internal_error(
                "workspace_policy_missing",
                "Workspace policy is missing",
                {"workspace_id": payload.workspace_id},
            )

        command_preview = payload.command_override or str(agent_row["command_template"])
        allowed_command_prefixes = json.loads(policy_row["allowed_command_prefixes"])
        execution_enabled = get_bool_setting(
            database_path,
            "runner.execution_enabled",
            default=settings.execution_enabled,
        )
        blocking_reasons: list[str] = []

        if not payload.dry_run and not execution_enabled:
            blocking_reasons.append("Real execution is disabled globally.")
        if (
            not payload.dry_run
            and execution_enabled
            and not any(command_preview.startswith(prefix) for prefix in allowed_command_prefixes)
        ):
            blocking_reasons.append("Command is not allowed by the workspace policy.")

        return RunPreviewRead(
            workspace_id=str(workspace_row["id"]),
            workspace_name=str(workspace_row["name"]),
            workspace_slug=str(workspace_row["slug"]),
            workspace_root_path=str(workspace_row["root_path"]),
            agent_profile_id=str(agent_row["id"]),
            agent_name=str(agent_row["name"]),
            agent_runtime=str(agent_row["runtime"]),
            policy_id=str(policy_row["id"]),
            policy_name=str(policy_row["name"]),
            dry_run=payload.dry_run,
            command_preview=command_preview,
            execution_enabled=execution_enabled,
            allow_write=bool(policy_row["allow_write"]),
            allow_network=bool(policy_row["allow_network"]),
            allowed_command_prefixes=allowed_command_prefixes,
            blocking_reasons=blocking_reasons,
        )


def _append_run_log(database_path: Path, run_id: str, level: str, message: str) -> None:
    with get_connection(database_path) as connection:
        connection.execute(
            '''
            INSERT INTO run_logs (id, run_id, level, message, timestamp)
            VALUES (?, ?, ?, ?, ?)
            ''',
            (f"log_{uuid4().hex[:12]}", run_id, level, message, utc_now_iso()),
        )


def _finish_run(
    database_path: Path,
    run_id: str,
    *,
    status: RunStatus,
    exit_code: int | None,
) -> None:
    with get_connection(database_path) as connection:
        connection.execute(
            "UPDATE runs SET status = ?, finished_at = ?, exit_code = ? WHERE id = ?",
            (status.value, utc_now_iso(), exit_code, run_id),
        )


def _write_summary_artifact(
    database_path: Path,
    *,
    run_id: str,
    workspace_name: str,
    agent_name: str,
    dry_run: bool,
    command_preview: str,
) -> None:
    artifacts_root = get_settings().artifacts_root
    artifact_dir = artifacts_root / run_id
    artifact_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = artifact_dir / "summary.md"
    artifact_path.write_text(
        "\n".join(
            [
                f"# Run {run_id}",
                "",
                f"- workspace: {workspace_name}",
                f"- agent: {agent_name}",
                f"- dry_run: {str(dry_run).lower()}",
                f"- command_preview: `{command_preview}`",
            ]
        ),
        encoding="utf-8",
    )

    relative_path = str(artifact_path.relative_to(artifacts_root))
    with get_connection(database_path) as connection:
        connection.execute(
            '''
            INSERT INTO run_artifacts (id, run_id, name, relative_path, media_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (
                f"artifact_{uuid4().hex[:12]}",
                run_id,
                "summary.md",
                relative_path,
                "text/markdown",
                utc_now_iso(),
            ),
        )


def _execute_run_background(
    *,
    database_path: Path,
    run_id: str,
    command_preview: str,
    cwd: Path,
    timeout_seconds: int,
    allowed_command_prefixes: list[str],
    workspace_name: str,
    agent_name: str,
    dry_run: bool,
) -> None:
    result = run_controlled_command_streaming(
        command=command_preview,
        cwd=cwd,
        timeout_seconds=timeout_seconds,
        allowed_command_prefixes=allowed_command_prefixes,
        on_log=lambda log: _append_run_log(database_path, run_id, log.level, log.message),
    )
    _finish_run(database_path, run_id, status=result.status, exit_code=result.exit_code)
    _write_summary_artifact(
        database_path,
        run_id=run_id,
        workspace_name=workspace_name,
        agent_name=agent_name,
        dry_run=dry_run,
        command_preview=command_preview,
    )


def create_run(database_path: Path, payload: RunCreate, *, run_inline: bool = False) -> RunRead:
    settings = get_settings()

    with get_connection(database_path) as connection:
        workspace_row = connection.execute(
            "SELECT * FROM workspaces WHERE id = ?",
            (payload.workspace_id,),
        ).fetchone()
        if workspace_row is None:
            raise bad_request(
                "unknown_workspace_id",
                "Unknown workspace_id",
                {"workspace_id": payload.workspace_id},
            )

        agent_row = connection.execute(
            "SELECT * FROM agent_profiles WHERE id = ?",
            (payload.agent_profile_id,),
        ).fetchone()
        if agent_row is None:
            raise bad_request(
                "unknown_agent_profile_id",
                "Unknown agent_profile_id",
                {"agent_profile_id": payload.agent_profile_id},
            )
        if not bool(agent_row["is_active"]):
            raise conflict(
                "agent_profile_inactive",
                "Agent profile is inactive",
                {"agent_profile_id": payload.agent_profile_id},
            )
        if agent_row["workspace_id"] is not None and agent_row["workspace_id"] != payload.workspace_id:
            raise conflict(
                "agent_workspace_mismatch",
                "Agent profile is bound to a different workspace",
                {
                    "agent_profile_id": payload.agent_profile_id,
                    "agent_workspace_id": str(agent_row["workspace_id"]),
                    "workspace_id": payload.workspace_id,
                },
            )

        policy_row = connection.execute(
            "SELECT * FROM workspace_policies WHERE id = ?",
            (workspace_row["policy_id"],),
        ).fetchone()
        if policy_row is None:
            raise internal_error(
                "workspace_policy_missing",
                "Workspace policy is missing",
                {"workspace_id": payload.workspace_id},
            )

        command_preview = payload.command_override or str(agent_row["command_template"])
        log_entries: list[tuple[str, str]] = [
            ("INFO", f"Run requested for workspace {workspace_row['slug']}."),
            ("INFO", f"Command preview: {command_preview}"),
        ]
        status = RunStatus.running
        finished_at: str | None = None
        exit_code: int | None = None
        should_execute = False

        if payload.dry_run:
            status = RunStatus.completed
            finished_at = utc_now_iso()
            exit_code = 0
            log_entries.append(
                ("INFO", "Simulation complete; real execution remains disabled by default.")
            )
        elif not get_bool_setting(
            database_path,
            "runner.execution_enabled",
            default=settings.execution_enabled,
        ):
            status = RunStatus.blocked
            finished_at = utc_now_iso()
            log_entries.append(
                ("ERROR", "Execution blocked: real execution is disabled globally.")
            )
        else:
            blocking_log = get_command_blocking_reason(
                command=command_preview,
                cwd=Path(str(workspace_row["root_path"])),
                allowed_command_prefixes=json.loads(policy_row["allowed_command_prefixes"]),
            )
            if blocking_log is not None:
                status = (
                    RunStatus.blocked
                    if "blocked" in blocking_log.message.lower()
                    else RunStatus.failed
                )
                finished_at = utc_now_iso()
                log_entries.append((blocking_log.level, blocking_log.message))
            else:
                should_execute = True

        run_id = f"run_{uuid4().hex[:12]}"
        now = utc_now_iso()

        connection.execute(
            '''
            INSERT INTO runs (
                id, workspace_id, agent_profile_id, trigger, status, dry_run,
                requested_by, command_preview, started_at, finished_at, exit_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                run_id,
                payload.workspace_id,
                payload.agent_profile_id,
                payload.trigger.value,
                status.value,
                int(payload.dry_run),
                payload.requested_by,
                command_preview,
                now,
                finished_at,
                exit_code,
            ),
        )

        for level, message in log_entries:
            connection.execute(
                '''
                INSERT INTO run_logs (id, run_id, level, message, timestamp)
                VALUES (?, ?, ?, ?, ?)
                ''',
                (f"log_{uuid4().hex[:12]}", run_id, level, message, utc_now_iso()),
            )

        row = connection.execute(
            "SELECT * FROM runs WHERE id = ?",
            (run_id,),
        ).fetchone()

    if row is None:
        raise internal_error("run_create_failed", "Failed to create run")
    if not should_execute:
        _write_summary_artifact(
            database_path,
            run_id=run_id,
            workspace_name=str(workspace_row["name"]),
            agent_name=str(agent_row["name"]),
            dry_run=payload.dry_run,
            command_preview=command_preview,
        )
    if should_execute:
        run_kwargs = {
            "database_path": database_path,
            "run_id": run_id,
            "command_preview": command_preview,
            "cwd": Path(str(workspace_row["root_path"])),
            "timeout_seconds": int(policy_row["max_runtime_seconds"]),
            "allowed_command_prefixes": json.loads(policy_row["allowed_command_prefixes"]),
            "workspace_name": str(workspace_row["name"]),
            "agent_name": str(agent_row["name"]),
            "dry_run": payload.dry_run,
        }
        if run_inline:
            _execute_run_background(**run_kwargs)
            return get_run(database_path, run_id)
        threading.Thread(target=_execute_run_background, kwargs=run_kwargs, daemon=True).start()
    return _row_to_run(row)
