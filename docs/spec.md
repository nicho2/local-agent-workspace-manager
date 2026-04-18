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
- `root_path`
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
- `GET|POST /workspaces`
- `GET /workspaces/{workspace_id}`
- `GET|POST /agents`
- `GET|POST /schedules`
- `GET|POST /runs`
- `GET /runs/{run_id}`
- `GET /runs/{run_id}/logs`
- `GET /runs/{run_id}/artifacts`
- `GET|PUT /settings`
- `PUT /settings/{key}`

## 6. Safety rules

- `execution_enabled=false` by default
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
