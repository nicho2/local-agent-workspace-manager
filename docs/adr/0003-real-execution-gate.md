# ADR 0003 - Real execution gate

## Status
Accepted

## Decision
Allow non-dry-run command execution only when both gates pass:

- the global `execution_enabled` setting is true
- the workspace policy explicitly allows the command prefix

When a gate refuses execution, the API persists a run with `status=blocked`
instead of dropping the request. Allowed commands run through a controlled
subprocess call with an explicit argument list, workspace `cwd`, timeout, and
captured stdout/stderr. The runner never uses `shell=True`.

## Rationale
The product needs an auditable transition from simulation to real local command
execution. Persisting blocked runs keeps a trail of attempted real executions,
while the double gate prevents accidental command execution by default.

## Consequences
- dry-run behavior remains the default
- blocked real executions are visible in run history and logs
- command templates are split with `shlex.split`, so complex shell syntax is
  intentionally unsupported until a safer command model exists
- this is still not an OS sandbox; future hardening should consider containers
  or platform-level isolation
