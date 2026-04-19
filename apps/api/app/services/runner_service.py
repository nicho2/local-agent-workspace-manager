import os
import shlex
import subprocess
from dataclasses import dataclass
from pathlib import Path

from app.schemas.run import RunStatus

MAX_CAPTURED_OUTPUT_CHARS = 4000


@dataclass(frozen=True)
class RunnerLogEntry:
    level: str
    message: str


@dataclass(frozen=True)
class RunnerResult:
    status: RunStatus
    logs: list[RunnerLogEntry]


def _split_command(command: str) -> list[str]:
    args = shlex.split(command, posix=os.name != "nt")
    if os.name == "nt":
        return [_strip_wrapping_quotes(arg) for arg in args]
    return args


def _strip_wrapping_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def _truncate_output(output: str | None) -> str:
    if not output:
        return ""
    if len(output) <= MAX_CAPTURED_OUTPUT_CHARS:
        return output
    return f"{output[:MAX_CAPTURED_OUTPUT_CHARS]}\n...[truncated]"


def _is_allowed_command(command_args: list[str], allowed_prefixes: list[str]) -> bool:
    for prefix in allowed_prefixes:
        prefix_args = _split_command(prefix)
        if prefix_args and command_args[: len(prefix_args)] == prefix_args:
            return True
    return False


def run_controlled_command(
    *,
    command: str,
    cwd: Path,
    timeout_seconds: int,
    allowed_command_prefixes: list[str],
) -> RunnerResult:
    command_args = _split_command(command)
    if not command_args:
        return RunnerResult(
            status=RunStatus.blocked,
            logs=[RunnerLogEntry("ERROR", "Execution blocked: command is empty.")],
        )

    if not _is_allowed_command(command_args, allowed_command_prefixes):
        return RunnerResult(
            status=RunStatus.blocked,
            logs=[
                RunnerLogEntry(
                    "ERROR",
                    "Execution blocked: command prefix is not allowed by workspace policy.",
                )
            ],
        )

    if not cwd.exists() or not cwd.is_dir():
        return RunnerResult(
            status=RunStatus.failed,
            logs=[RunnerLogEntry("ERROR", f"Execution failed: cwd does not exist: {cwd}")],
        )

    try:
        completed = subprocess.run(
            command_args,
            cwd=cwd,
            timeout=timeout_seconds,
            capture_output=True,
            text=True,
            shell=False,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        logs = [RunnerLogEntry("ERROR", f"Execution timed out after {timeout_seconds} seconds.")]
        stdout = _truncate_output(exc.stdout if isinstance(exc.stdout, str) else None)
        stderr = _truncate_output(exc.stderr if isinstance(exc.stderr, str) else None)
        if stdout:
            logs.append(RunnerLogEntry("INFO", f"stdout:\n{stdout}"))
        if stderr:
            logs.append(RunnerLogEntry("ERROR", f"stderr:\n{stderr}"))
        return RunnerResult(status=RunStatus.failed, logs=logs)
    except OSError as exc:
        return RunnerResult(
            status=RunStatus.failed,
            logs=[RunnerLogEntry("ERROR", f"Execution failed to start: {exc}")],
        )

    logs: list[RunnerLogEntry] = [
        RunnerLogEntry("INFO", f"Process exited with code {completed.returncode}.")
    ]
    stdout = _truncate_output(completed.stdout)
    stderr = _truncate_output(completed.stderr)
    if stdout:
        logs.append(RunnerLogEntry("INFO", f"stdout:\n{stdout}"))
    if stderr:
        logs.append(RunnerLogEntry("ERROR", f"stderr:\n{stderr}"))

    status = RunStatus.completed if completed.returncode == 0 else RunStatus.failed
    return RunnerResult(status=status, logs=logs)
