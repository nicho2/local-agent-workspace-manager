# Technical Specification

## 1. Stack

### Backend
- Python 3.12+
- FastAPI
- Pydantic v2
- SQLite via `sqlite3`
- `uvicorn` for local serving

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

## 6. Safety rules

- `execution_enabled=false` by default
- workspace `root_path` must resolve inside one of `workspace_allowed_roots`
- inactive agents cannot start runs
- workspace-bound agents can only run in their bound workspace
- runner must never use `shell=True`
- runner must receive an explicit working directory
- policies expose allowlist-style command prefixes
- real execution must be rejected when globally disabled
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
