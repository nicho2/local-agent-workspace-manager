import asyncio
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.errors import AppError
from app.db.database import get_connection, utc_now_iso
from app.schemas.run import RunCreate, RunTrigger
from app.schemas.schedule import ScheduleMode
from app.services.cron_service import calculate_next_cron_run
from app.services.run_service import create_run


@dataclass(frozen=True)
class ScheduleWorkerResult:
    processed_count: int
    created_run_ids: list[str] = field(default_factory=list)
    skipped_count: int = 0
    failed_count: int = 0


@dataclass(frozen=True)
class _ClaimedSchedule:
    id: str
    workspace_id: str
    agent_profile_id: str


def _normalize_now(now: datetime | None) -> datetime:
    resolved_now = now or datetime.now(timezone.utc)
    if resolved_now.tzinfo is None:
        resolved_now = resolved_now.replace(tzinfo=timezone.utc)
    return resolved_now.astimezone(timezone.utc).replace(microsecond=0)


def _next_interval_run_at(now: datetime, interval_minutes: int) -> str:
    return (now + timedelta(minutes=interval_minutes)).isoformat()


def process_due_schedules(database_path: Path, now: datetime | None = None) -> ScheduleWorkerResult:
    """Claim due schedules and trigger dry-run runs for them."""
    current_time = _normalize_now(now)
    claimed_schedules: list[_ClaimedSchedule] = []
    skipped_count = 0

    with get_connection(database_path) as connection:
        rows = connection.execute(
            '''
            SELECT *
            FROM schedules
            WHERE enabled = 1
              AND mode IN (?, ?)
              AND next_run_at IS NOT NULL
              AND next_run_at <= ?
            ORDER BY next_run_at ASC, rowid ASC
            ''',
            (
                ScheduleMode.interval.value,
                ScheduleMode.cron.value,
                current_time.isoformat(),
            ),
        ).fetchall()

        for row in rows:
            mode = ScheduleMode(str(row["mode"]))
            if mode == ScheduleMode.interval:
                interval_minutes = row["interval_minutes"]
                if interval_minutes is None:
                    skipped_count += 1
                    continue
                next_run_at = _next_interval_run_at(current_time, int(interval_minutes))
            elif mode == ScheduleMode.cron:
                cron_expression = row["cron_expression"]
                if not cron_expression:
                    skipped_count += 1
                    continue
                next_run_at = calculate_next_cron_run(cron_expression, now=current_time)
            else:
                skipped_count += 1
                continue

            result = connection.execute(
                '''
                UPDATE schedules
                SET next_run_at = ?, updated_at = ?
                WHERE id = ?
                  AND enabled = 1
                  AND next_run_at = ?
                ''',
                (
                    next_run_at,
                    utc_now_iso(),
                    row["id"],
                    row["next_run_at"],
                ),
            )
            if result.rowcount != 1:
                skipped_count += 1
                continue

            claimed_schedules.append(
                _ClaimedSchedule(
                    id=row["id"],
                    workspace_id=row["workspace_id"],
                    agent_profile_id=row["agent_profile_id"],
                )
            )

    created_run_ids: list[str] = []
    failed_count = 0
    for schedule in claimed_schedules:
        try:
            run = create_run(
                database_path,
                RunCreate(
                    workspace_id=schedule.workspace_id,
                    agent_profile_id=schedule.agent_profile_id,
                    trigger=RunTrigger.schedule,
                    requested_by="schedule-worker",
                    dry_run=True,
                ),
            )
        except AppError:
            failed_count += 1
            continue
        created_run_ids.append(run.id)

    return ScheduleWorkerResult(
        processed_count=len(created_run_ids),
        created_run_ids=created_run_ids,
        skipped_count=skipped_count,
        failed_count=failed_count,
    )


async def run_schedule_worker_loop(
    *,
    database_path: Path,
    poll_seconds: int,
    processor: Callable[[Path], ScheduleWorkerResult] = process_due_schedules,
) -> None:
    while True:
        processor(database_path)
        await asyncio.sleep(poll_seconds)
