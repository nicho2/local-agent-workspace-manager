# Technical Specification

## 1. Stack

### Backend
- Python 3.12+
- FastAPI
- Pydantic v2
- SQLite via `sqlite3`
- `uvicorn` for local serving
- CORS origins configured with `LAWM_CORS_ALLOWED_ORIGINS`, defaulting to the
  local Next.js dev origins

### Frontend
- Next.js
- TypeScript
- typed API client
- CSS modules/global CSS for initial implementation

### Storage
- SQLite database in `storage/sqlite/`
- run logs in DB plus file-based artifacts in `storage/artifacts/`
- workspace roots must be located under configured allowed roots

## 2. Architectural principles

- local-first
- explicit policies
- dry-run by default
- auditable side effects
- typed contracts at every boundary
- easy to run on one machine

## 3. Backend modules

- `app/core/` — configuration
- `app/db/` — schema bootstrap and SQLite helpers
- `app/schemas/` — Pydantic request/response contracts
- `app/services/` — business logic
- `app/routers/` — HTTP endpoints

## 4. Data model

### WorkspacePolicy
- `id`
- `name`
- `description`
- `max_runtime_seconds`
- `allow_write`
- `allow_network`
- `allowed_command_prefixes`
- `created_at`
- `updated_at`

### Workspace
- `id`
- `name`
- `slug`
- `root_path` normalized with `Path.resolve()` and bounded by allowed roots
- `description`
- `tags`
- `status`
- `policy_id`
- `created_at`
- `updated_at`

### AgentProfile
- `id`
- `name`
- `runtime`
- `workspace_id` nullable
- `command_template`
- `system_prompt`
- `environment`
- `is_active`
- `created_at`
- `updated_at`

### Schedule
- `id`
- `name`
- `workspace_id`
- `agent_profile_id`
- `mode`
- `interval_minutes` nullable
- `cron_expression` nullable
- `enabled`
- `next_run_at`
- `created_at`
- `updated_at`

### Run
- `id`
- `workspace_id`
- `agent_profile_id`
- `trigger`
- `status`
- `dry_run`
- `requested_by`
- `command_preview`
- `started_at`
- `finished_at`

### RunLog
- `id`
- `run_id`
- `level`
- `message`
- `timestamp`

### RunArtifact
- `id`
- `run_id`
- `name`
- `relative_path`
- `media_type`
- `created_at`

### SystemSetting
- `key`
- `value`
- `description`
- `updated_at`

## 5. API resources

- `GET /health`
- `GET /dashboard/summary`
- `GET|POST /policies`
- `PUT /policies/{policy_id}`
- `GET|POST /workspaces`
- `GET|PUT /workspaces/{workspace_id}`
- `GET|POST /agents`
- `PUT /agents/{agent_profile_id}`
- `GET|POST /schedules`
- `PUT /schedules/{schedule_id}`
- `GET|POST /runs`
- `GET /runs/{run_id}`
- `GET /runs/{run_id}/logs`
- `GET /runs/{run_id}/artifacts`
- `GET|PUT /settings`
- `PUT /settings/{key}`

### Error response

Business and service errors use a structured JSON body:

```json
{
  "code": "unknown_policy_id",
  "message": "Unknown policy_id",
  "details": {
    "policy_id": "policy_missing"
  }
}
```

The `code` field is stable for UI branching, `message` is human-readable, and
`details` contains optional resource identifiers or context. Existing HTTP
status codes remain meaningful: validation errors use `400`, missing resources
use `404`, conflicts such as duplicate names or disabled real execution use
`409`, and unexpected invariant failures use `500`.

### Workspace updates

`PUT /workspaces/{workspace_id}` accepts partial updates for:

- `name`
- `root_path`
- `description`
- `tags`
- `status`
- `policy_id`

`root_path` is normalized and checked against `workspace_allowed_roots` using
the same rule as creation. `policy_id` must reference an existing policy.
Setting `status` to `archived` archives the workspace metadata without deleting
runs, logs, artifacts, schedules, or agents associated with it. Successful
updates refresh `updated_at` with a UTC ISO-8601 timestamp.

### Policy updates

`PUT /policies/{policy_id}` accepts partial updates for:

- `name`
- `description`
- `max_runtime_seconds`
- `allow_write`
- `allow_network`
- `allowed_command_prefixes`

`name` remains unique. `max_runtime_seconds` must stay between `30` and
`7200` seconds. Command prefixes are explicit allowlist entries and cannot be
empty strings. Successful updates refresh `updated_at` with a UTC ISO-8601
timestamp.

### Agent updates

`PUT /agents/{agent_profile_id}` accepts partial updates for:

- `name`
- `runtime`
- `workspace_id`
- `command_template`
- `system_prompt`
- `environment`
- `is_active`

`workspace_id` may be `null`, which makes the agent profile global. When it is
set, it must reference an existing workspace. Runs are rejected when the agent
profile is inactive. Runs are also rejected when a workspace-bound agent is
used with a different workspace; global agents can run against any existing
workspace. Successful updates refresh `updated_at` with a UTC ISO-8601
timestamp.

### Schedule updates

`PUT /schedules/{schedule_id}` accepts partial updates for:

- `name`
- `workspace_id`
- `agent_profile_id`
- `mode`
- `interval_minutes`
- `cron_expression`
- `enabled`

`workspace_id` and `agent_profile_id` must reference existing resources. For
`mode=interval`, `interval_minutes` is required and must stay between `5` and
`10080`. For `mode=cron`, `cron_expression` is required, but the MVP does not
parse cron expressions yet, so `next_run_at` remains `null` until worker support
is introduced. When an interval schedule is enabled, `next_run_at` is recalculated
from the current UTC time. When any schedule is disabled, `next_run_at` is set to
`null`. Successful updates refresh `updated_at` with a UTC ISO-8601 timestamp.

### Schedule worker

The local schedule worker is disabled by default through
`schedule_worker_enabled=false`. When enabled, the FastAPI lifespan starts a
single-process polling loop that calls `process_due_schedules` every
`schedule_worker_poll_seconds` seconds.

For the MVP, the worker processes enabled `interval` schedules whose
`next_run_at` is due. Each due schedule is claimed with a conditional database
update before run creation, which prevents repeated processing by the local
worker for the same due timestamp. The worker triggers runs with
`trigger=schedule`, `requested_by=schedule-worker`, and `dry_run=true`, then
advances `next_run_at` by the schedule interval from the processing time.
Disabled schedules, non-due schedules, and `cron` schedules do not create runs.

### Settings

`GET /settings` returns persisted system settings. `PUT /settings/{key}` accepts
`{"value": "..."}` and updates `updated_at` with a UTC ISO-8601 timestamp.

The `runner.execution_enabled` setting is the operational source for real
execution and dashboard status. It is seeded from `LAWM_EXECUTION_ENABLED` on a
new database, remains `false` by default, and can later be changed explicitly
through the settings API. Changing the setting does not launch any run.

### Demo seed

`scripts/seed_demo.py` initializes a reproducible local demo dataset. It is
idempotent and creates only missing records:

- the existing `default-safe` policy
- `Demo Maintenance` under `examples/workspaces/demo-maintenance`
- `Repo Triage` under `examples/workspaces/repo-triage`
- one active `copilot_cli` agent per demo workspace
- one disabled interval schedule per demo workspace

The seed uses the same service-layer validation as the API, so workspace paths
remain bounded by `workspace_allowed_roots`. Existing demo records are reused
by natural keys such as workspace slug, agent name/workspace, and schedule
name/workspace/agent; the script does not overwrite existing user edits.

### Run history

`GET /runs` returns the 20 most recent runs ordered by `started_at` descending.
`GET /runs/{run_id}` returns run metadata. `GET /runs/{run_id}/logs` returns log
entries ordered chronologically by `timestamp`, with insertion order preserved
for entries that share the same timestamp. `GET /runs/{run_id}/artifacts`
returns artifacts ordered by `created_at`.

Run logs expose `id`, `run_id`, `level`, `message`, and `timestamp`. Run
artifacts expose `id`, `run_id`, `name`, `relative_path`, `media_type`, and
`created_at`. Detail, logs, and artifacts endpoints all return structured `404`
errors when the run does not exist.

### Real execution

`POST /runs` keeps dry-runs as the default. When `dry_run=false`, the run is
created for auditability and receives a terminal status:

- `blocked` when `execution_enabled=false`
- `blocked` when the command does not start with an allowed policy prefix
- `completed` when the controlled subprocess exits with code `0`
- `failed` when the subprocess exits non-zero, times out, cannot start, or has
  an invalid working directory

Real execution uses an explicit argument list derived from the command template
with `shlex.split`; it never uses `shell=True`. The runner always sets `cwd` to
the workspace `root_path`, uses the workspace policy `max_runtime_seconds` as
the subprocess timeout, and captures stdout/stderr into bounded run logs.
Captured stdout/stderr entries are truncated after `4000` characters per stream.

## 6. Safety rules

- `execution_enabled=false` by default
- workspace `root_path` must resolve inside one of `workspace_allowed_roots`
- inactive agents cannot start runs
- workspace-bound agents can only run in their bound workspace
- real execution must be globally enabled and policy-prefix allowed
- runner must never use `shell=True`
- runner must receive an explicit working directory
- runner must set a timeout and capture stdout/stderr explicitly
- policies expose allowlist-style command prefixes
- dry-run remains allowed

## 7. Testing requirements

- every route with business logic must have pytest coverage
- every schema validator must have a direct or indirect test
- every bug fix must include a regression test
- frontend business logic must be test-ready even if the initial UI remains skeleton-level

## 8. Planned evolution

- real scheduler worker
- GitHub Copilot CLI integration
- richer policy enforcement
- per-run file change tracking
- secret references
- authentication / RBAC
