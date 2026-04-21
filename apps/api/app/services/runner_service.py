import os
import queue
import re
import shlex
import subprocess
import threading
import time
from dataclasses import dataclass
from collections.abc import Callable
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
    exit_code: int | None = None


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


ANSI_PATTERN = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")


def _clean_output_line(line: str) -> str:
    return ANSI_PATTERN.sub("", line).strip()


def _is_allowed_command(command_args: list[str], allowed_prefixes: list[str]) -> bool:
    for prefix in allowed_prefixes:
        prefix_args = _split_command(prefix)
        if prefix_args and command_args[: len(prefix_args)] == prefix_args:
            return True
    return False


def get_command_blocking_reason(
    *,
    command: str,
    cwd: Path,
    allowed_command_prefixes: list[str],
) -> RunnerLogEntry | None:
    command_args = _split_command(command)
    if not command_args:
        return RunnerLogEntry("ERROR", "Execution blocked: command is empty.")

    if not _is_allowed_command(command_args, allowed_command_prefixes):
        return RunnerLogEntry(
            "ERROR",
            "Execution blocked: command prefix is not allowed by workspace policy.",
        )

    if not cwd.exists() or not cwd.is_dir():
        return RunnerLogEntry("ERROR", f"Execution failed: cwd does not exist: {cwd}")

    return None


def run_controlled_command(
    *,
    command: str,
    cwd: Path,
    timeout_seconds: int,
    allowed_command_prefixes: list[str],
) -> RunnerResult:
    command_args = _split_command(command)
    if not command_args:
        return RunnerResult(status=RunStatus.blocked, logs=[RunnerLogEntry("ERROR", "Execution blocked: command is empty.")])

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
        return RunnerResult(status=RunStatus.failed, logs=[RunnerLogEntry("ERROR", f"Execution failed: cwd does not exist: {cwd}")])

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
    return RunnerResult(status=status, logs=logs, exit_code=completed.returncode)


def run_controlled_command_streaming(
    *,
    command: str,
    cwd: Path,
    timeout_seconds: int,
    allowed_command_prefixes: list[str],
    on_log: Callable[[RunnerLogEntry], None],
) -> RunnerResult:
    command_args = _split_command(command)
    blocking_log = get_command_blocking_reason(
        command=command,
        cwd=cwd,
        allowed_command_prefixes=allowed_command_prefixes,
    )
    if blocking_log is not None:
        on_log(blocking_log)
        status = RunStatus.blocked if "blocked" in blocking_log.message.lower() else RunStatus.failed
        return RunnerResult(status=status, logs=[blocking_log])

    try:
        process = subprocess.Popen(
            command_args,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            shell=False,
        )
    except OSError as exc:
        log = RunnerLogEntry("ERROR", f"Execution failed to start: {exc}")
        on_log(log)
        return RunnerResult(status=RunStatus.failed, logs=[log])

    output_queue: queue.Queue[str | None] = queue.Queue()

    def read_output() -> None:
        assert process.stdout is not None
        for raw_line in process.stdout:
            output_queue.put(raw_line)
        output_queue.put(None)

    reader = threading.Thread(target=read_output, daemon=True)
    reader.start()

    logs: list[RunnerLogEntry] = []
    deadline = time.monotonic() + timeout_seconds
    saw_reader_done = False

    while True:
        if time.monotonic() > deadline and process.poll() is None:
            process.kill()
            log = RunnerLogEntry("ERROR", f"Execution timed out after {timeout_seconds} seconds.")
            logs.append(log)
            on_log(log)
            return RunnerResult(status=RunStatus.failed, logs=logs)

        try:
            item = output_queue.get(timeout=0.2)
        except queue.Empty:
            if saw_reader_done and process.poll() is not None:
                break
            continue

        if item is None:
            saw_reader_done = True
            if process.poll() is not None:
                break
            continue

        for fragment in item.replace("\r", "\n").splitlines():
            message = _clean_output_line(fragment)
            if message:
                log = RunnerLogEntry("INFO", message)
                logs.append(log)
                on_log(log)

    exit_code = process.wait()
    final_log = RunnerLogEntry("INFO", f"Process exited with code {exit_code}.")
    logs.append(final_log)
    on_log(final_log)
    status = RunStatus.completed if exit_code == 0 else RunStatus.failed
    return RunnerResult(status=status, logs=logs, exit_code=exit_code)
