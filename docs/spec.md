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
- `GET /safety/summary`
- `GET|POST /policies`
- `PUT /policies/{policy_id}`
- `GET|POST /workspaces`
- `GET /workspaces/allowed-roots`
- `GET|PUT /workspaces/{workspace_id}`
- `GET|POST /agents`
- `GET /agents/runtime-presets`
- `PUT /agents/{agent_profile_id}`
- `GET|POST /schedules`
- `PUT /schedules/{schedule_id}`
- `GET|POST /runs`
- `POST /runs/preview`
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

### Workspace allowed roots

`GET /workspaces/allowed-roots` returns the resolved workspace roots configured
through `LAWM_WORKSPACE_ALLOWED_ROOTS`:

```json
{
  "allowed_roots": ["E:\\temp"]
}
```

The endpoint is read-only and exists so the UI can guide directory selection
without weakening backend path validation. The backend remains the authority:
workspace creation and updates still reject paths outside these roots.

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

### Runtime capability presets

`GET /agents/runtime-presets` returns the central runtime capability contract
used by the UI when it needs runtime defaults. Presets are read-only and do not
enable real execution. The initial supported presets are:

- `copilot_cli`
- `codex`
- `local_command`

Each preset exposes:

- `runtime`
- `display_name`
- `description`
- `default_command_template`
- `supports_dry_run`
- `requires_write_access`
- `requires_network_access`
- `recommended_policy_prefixes`
- `environment_defaults`

The default command template is only a suggested agent profile value. Real
execution still requires the global `runner.execution_enabled` setting and a
workspace policy prefix that explicitly allows the command.

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
parse cron expressions yet, so `next_run_at` remains `null`. When an interval
schedule is enabled, `next_run_at` is recalculated from the current UTC time.
When any schedule is disabled, `next_run_at` is set to `null`. Successful
updates refresh `updated_at` with a UTC ISO-8601 timestamp.

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

### Safety summary

`GET /safety/summary` returns a read-only operational posture summary for the
Safety Center. It does not change settings, policies, schedules, agents, or
runs. The response includes:

- persisted `runner.execution_enabled`
- configured workspace allowed roots
- policies where `allow_write=true` or `allow_network=true`
- active agents, including their runtime and workspace scope
- enabled schedules, including workspace, agent, mode, and `next_run_at`
- the five most recent `blocked` or `failed` runs with workspace and agent names

The Safety Center links these findings back to the existing settings,
workspace, schedule, and run detail pages. It must continue to state that the
application is a guarded local runner, not an OS sandbox.

### UI internationalization

The web UI uses frontend dictionaries for user-facing labels. English (`en`) and
French (`fr`) are supported. The selected language is changed from the dashboard
language selector and persisted in browser `localStorage` under `lawm.locale`, so
it remains stable while navigating between pages on the same browser profile.

Navigation, dashboard, workspace, run, schedule, settings, table headings, and
primary form labels read from translation keys. Technical values returned by the
API, run statuses, raw logs, artifact names, setting keys, and backend error
messages remain displayed as returned so audit/debug information is not altered.

### Empty-state onboarding

Dashboard, workspace, run, and schedule empty states guide first use instead of
looking like errors. They point to workspace creation, Settings, and the Safety
Center, remind the user that dry-run remains the default, and show the
terminal-only demo seed command:

```text
py -3.12 scripts/seed_demo.py
```

The dashboard and workspace empty states display configured allowed workspace
roots when available. The UI does not execute the seed script directly.

### Guided workspace setup

The Workspaces page links to a dedicated `/workspaces/guided` setup page from
the heading area. The guided page uses existing API contracts only:
`POST /policies`, then `POST /workspaces` with the created policy id, then
`POST /agents` scoped to the created workspace. No backend batch endpoint is
required for this slice.

Initial guided use cases are:

- documentation maintenance
- repository triage
- Obsidian cleanup
- backlog review

Each preset fills workspace metadata, tags, policy name and permissions, agent
name, runtime, command template, system prompt, and command prefixes. All values
remain visible and editable before creation. The final safety review reiterates
the root path, exact command, allowed prefixes, and that real execution is not
enabled by this setup.

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

The seeded `default-safe` policy uses these command prefixes:

```json
["copilot", "python -m pytest", "npm test"]
```

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

### Run audit timeline

The run detail UI derives a human-readable audit timeline from the existing
run metadata, logs, and artifacts. No additional persistence contract is needed
for this slice. The timeline keeps raw logs visible and only summarizes events
that are backed by existing data:

- request received from the run metadata
- command captured from `command_preview`
- dry-run completion, real execution completion, execution blocked, or
  execution failed from the terminal run status
- decisive blocked/failed reason from the latest `ERROR` log when present
- recorded artifacts from the artifact list

Blocked and failed runs must surface the decisive log message in the timeline
when one exists, while the full raw log list remains available for audit.

### Run safety preview

`POST /runs/preview` accepts the same creation payload as `POST /runs` and
returns a read-only safety summary without creating a run, log, or artifact.
The preview uses the same workspace, agent, and policy validation rules as run
creation, so inactive agents, unknown resources, and workspace-bound agent
mismatches are rejected before the UI presents a launch action.

The response identifies the exact launch context:

- workspace id, name, slug, and resolved `root_path`
- agent id, name, and runtime
- policy id, name, allowed command prefixes, write flag, and network flag
- requested dry-run or real-execution mode
- exact `command_preview`
- current global `execution_enabled` value
- expected blocking reasons for a real execution request

The manual-run UI displays this preview before submission so the user can see
that agent `X` will launch in workspace `Y`, including the root path and command
that will be used. Real execution still goes through `POST /runs`; the preview
does not bypass the global execution setting or policy prefix checks.

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
- manual runs show a safety preview before launch
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
- frontend business logic must be covered where it affects MVP behavior

## 8. MVP delivered scope

- Local FastAPI API and Next.js UI
- SQLite-backed metadata, logs, and artifact references
- Bounded workspace roots through configured allowlists
- Create/edit workflows for workspaces, policies, agents, and schedules
- Manual dry-run launch from the UI
- Run history, detail, logs, and artifacts
- Optional interval schedule worker, disabled by default
- Controlled real execution guarded by global setting and policy prefix
- Reproducible demo seed

## 9. Known MVP limits

- Cron schedules are accepted as configuration but not executed by the worker.
- The schedule worker is in-process and single-machine only.
- Scheduled runs are dry-runs by default.
- Real command templates are split into explicit arguments and intentionally do
  not support shell syntax.
- The runner is guarded local execution, not an OS sandbox.
- There is no authentication, multi-user RBAC, secrets vault, distributed
  orchestration, or per-run file change tracking.

## 10. Planned evolution

- full cron support
- GitHub Copilot CLI integration
- richer policy enforcement
- per-run file change tracking
- secret references
- authentication / RBAC
