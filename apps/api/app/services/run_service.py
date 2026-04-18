from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.core.config import get_settings
from app.db.database import get_connection, utc_now_iso
from app.schemas.run import RunArtifactRead, RunCreate, RunLogRead, RunRead, RunStatus


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
        raise HTTPException(status_code=404, detail="Run not found")
    return _row_to_run(row)


def list_run_logs(database_path: Path, run_id: str) -> list[RunLogRead]:
    with get_connection(database_path) as connection:
        rows = connection.execute(
            "SELECT * FROM run_logs WHERE run_id = ? ORDER BY timestamp ASC",
            (run_id,),
        ).fetchall()
    return [_row_to_log(row) for row in rows]


def list_run_artifacts(database_path: Path, run_id: str) -> list[RunArtifactRead]:
    with get_connection(database_path) as connection:
        rows = connection.execute(
            "SELECT * FROM run_artifacts WHERE run_id = ? ORDER BY created_at ASC",
            (run_id,),
        ).fetchall()
    return [_row_to_artifact(row) for row in rows]


def create_run(database_path: Path, payload: RunCreate) -> RunRead:
    settings = get_settings()

    with get_connection(database_path) as connection:
        workspace_row = connection.execute(
            "SELECT * FROM workspaces WHERE id = ?",
            (payload.workspace_id,),
        ).fetchone()
        if workspace_row is None:
            raise HTTPException(status_code=400, detail="Unknown workspace_id")

        agent_row = connection.execute(
            "SELECT * FROM agent_profiles WHERE id = ?",
            (payload.agent_profile_id,),
        ).fetchone()
        if agent_row is None:
            raise HTTPException(status_code=400, detail="Unknown agent_profile_id")

        policy_row = connection.execute(
            "SELECT * FROM workspace_policies WHERE id = ?",
            (workspace_row["policy_id"],),
        ).fetchone()
        if policy_row is None:
            raise HTTPException(status_code=500, detail="Workspace policy missing")

        command_preview = payload.command_override or str(agent_row["command_template"])
        if not payload.dry_run and not settings.execution_enabled:
            raise HTTPException(
                status_code=409,
                detail="Real execution is disabled globally; use dry_run=true",
            )

        run_id = f"run_{uuid4().hex[:12]}"
        now = utc_now_iso()
        finished_at = utc_now_iso()

        connection.execute(
            '''
            INSERT INTO runs (
                id, workspace_id, agent_profile_id, trigger, status, dry_run,
                requested_by, command_preview, started_at, finished_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                run_id,
                payload.workspace_id,
                payload.agent_profile_id,
                payload.trigger.value,
                RunStatus.completed.value if payload.dry_run else RunStatus.blocked.value,
                int(payload.dry_run),
                payload.requested_by,
                command_preview,
                now,
                finished_at,
            ),
        )

        log_entries = [
            ("INFO", f"Run {run_id} created for workspace {workspace_row['slug']}."),
            ("INFO", f"Command preview: {command_preview}"),
            (
                "INFO",
                "Simulation complete; real execution remains disabled by default."
                if payload.dry_run
                else "Execution blocked by global settings.",
            ),
        ]

        for level, message in log_entries:
            connection.execute(
                '''
                INSERT INTO run_logs (id, run_id, level, message, timestamp)
                VALUES (?, ?, ?, ?, ?)
                ''',
                (f"log_{uuid4().hex[:12]}", run_id, level, message, utc_now_iso()),
            )

        artifacts_root = settings.artifacts_root
        artifact_dir = artifacts_root / run_id
        artifact_dir.mkdir(parents=True, exist_ok=True)
        artifact_path = artifact_dir / "summary.md"
        artifact_path.write_text(
            "\n".join(
                [
                    f"# Run {run_id}",
                    "",
                    f"- workspace: {workspace_row['name']}",
                    f"- agent: {agent_row['name']}",
                    f"- dry_run: {str(payload.dry_run).lower()}",
                    f"- command_preview: `{command_preview}`",
                ]
            ),
            encoding="utf-8",
        )

        relative_path = str(artifact_path.relative_to(artifacts_root))
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

        row = connection.execute(
            "SELECT * FROM runs WHERE id = ?",
            (run_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=500, detail="Failed to create run")
    return _row_to_run(row)
