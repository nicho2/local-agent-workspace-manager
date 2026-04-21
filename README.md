# Local Agent Workspace Manager

Local-first application for launching, supervising, and auditing AI-agent runs
inside explicitly bounded workspaces, either manually or on a schedule.

The repository is intentionally opinionated:
- **Frontend**: Next.js / TypeScript
- **Backend**: FastAPI / Pydantic v2
- **Persistence**: SQLite
- **Execution model**: controlled subprocess runner, dry-run by default
- **Testing**: pytest for backend, Vitest for frontend flow checks

## Objectives

1. Manage isolated workspaces with explicit execution policies.
2. Attach one or more agent profiles to each workspace.
3. Launch runs manually or from schedules.
4. Keep logs, artifacts, and an auditable history.
5. Provide guardrails before enabling real command execution.

## Repository layout

```text
.
|-- AGENTS.md
|-- apps
|   |-- api
|   `-- web
|-- docs
|-- examples
|-- scripts
|-- storage
`-- docker-compose.yml
```

## Quick start

### Backend

```bash
cd apps/api
pip install -e .[dev]
python -m uvicorn app.main:app --reload
```

Workspace paths are bounded by `LAWM_WORKSPACE_ALLOWED_ROOTS`, which defaults to
`./examples/workspaces` for local development. Set it to a JSON array of allowed
base directories in the repository root `.env` if your workspaces live
elsewhere. Relative paths in this file are resolved from the repository root,
for example:

```bash
LAWM_WORKSPACE_ALLOWED_ROOTS='["/path/to/workspaces"]'
```

On Windows, prefer forward slashes or escaped backslashes inside the JSON value:

```env
LAWM_WORKSPACE_ALLOWED_ROOTS=["./examples/workspaces","E:/temp"]
```

The API allows browser requests from the local Next.js dev server by default:
`http://localhost:3000` and `http://127.0.0.1:3000`. Override
`LAWM_CORS_ALLOWED_ORIGINS` with a JSON array if the frontend runs elsewhere.

Scheduled runs are processed by a local background worker only when
`LAWM_SCHEDULE_WORKER_ENABLED=true`. The worker is disabled by default, polls
every `LAWM_SCHEDULE_WORKER_POLL_SECONDS` seconds, and triggers due interval
schedules as dry-runs.

Run tests:

```bash
cd apps/api
pytest
```

Seed reproducible demo data from the repository root:

```bash
py -3.12 scripts/seed_demo.py
```

The seed is idempotent. It ensures the safe default policy, two example
workspaces under `examples/workspaces`, one active agent per workspace, and two
disabled interval schedules. Existing demo records are reused rather than
overwritten.

On a fresh database, the web UI also surfaces this command in the dashboard and
workspace empty states. The UI does not execute the seed script itself; run it
from a terminal so the local filesystem action stays explicit. Empty states also
show the configured allowed workspace roots and remind that dry-run remains the
default.

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

Run frontend checks:

```bash
cd apps/web
npm test
npm run build
```

### Full stack via Docker

```bash
docker compose up --build
```

## Delivered documentation

- `docs/prd.md`
- `docs/spec.md`
- `docs/architecture.md`
- `docs/backlog.md`
- `docs/testing-strategy.md`
- `docs/codex-task-template.md`
- `docs/obsidian-vault-maintenance-copilot.md`
- `docs/adr/*`

## MVP implementation status

The MVP is delivered locally with:
- a runnable FastAPI backend and typed Next.js UI
- SQLite schema bootstrap and persisted system settings
- create/edit flows for workspaces, policies, agents, and schedules
- workspace detail, run list, run detail, logs, and artifacts views
- manual dry-run launch from the UI
- interval schedule processing through an optional local worker
- a controlled real-execution path guarded by both
  `runner.execution_enabled` and policy command prefixes
- reproducible demo data through `scripts/seed_demo.py`
- pytest and Vitest coverage for the MVP contracts and flows

Real command execution remains intentionally **disabled by default**. This
application is not an OS sandbox: only enable real execution for trusted
workspace roots, reviewed policies, and explicit command prefixes.

## Known MVP limits

- Schedule execution supports due `interval` schedules only; cron expressions
  can be stored but are not parsed by the worker.
- Scheduled runs are dry-runs by default.
- Real commands use explicit argument splitting and do not support shell syntax.
- There is no authentication, RBAC, secrets vault, distributed scheduler, or
  container-per-run isolation in the MVP.
