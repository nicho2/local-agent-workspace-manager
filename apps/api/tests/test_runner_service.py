import sys

from app.schemas.run import RunStatus
from app.services.runner_service import run_controlled_command_streaming


def test_streaming_runner_handles_non_utf8_output_without_hanging(tmp_path):
    result = run_controlled_command_streaming(
        command=(
            f'{sys.executable} -c "import sys; '
            "sys.stdout.buffer.write(b'\\x8f\\n'); "
            "sys.stdout.flush()\""
        ),
        cwd=tmp_path,
        timeout_seconds=3,
        allowed_command_prefixes=[f"{sys.executable} -c"],
        on_log=lambda _entry: None,
    )

    assert result.status == RunStatus.completed
    assert result.exit_code == 0
    assert any("code 0" in log.message for log in result.logs)
