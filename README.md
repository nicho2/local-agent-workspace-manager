# Local Agent Workspace Manager

Starter project for a local-first application that runs AI agents inside dedicated workspaces, either manually or on a schedule.

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
├── AGENTS.md
├── apps
│   ├── api
│   └── web
├── docs
├── examples
├── scripts
├── storage
└── docker-compose.yml
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
base directories if your workspaces live elsewhere, for example:

```bash
LAWM_WORKSPACE_ALLOWED_ROOTS='["/path/to/workspaces"]'
```

Scheduled runs are processed by a local background worker only when
`LAWM_SCHEDULE_WORKER_ENABLED=true`. The worker is disabled by default, polls
every `LAWM_SCHEDULE_WORKER_POLL_SECONDS` seconds, and triggers due interval
schedules as dry-runs.

Run tests:

```bash
cd apps/api
pytest
```

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
- `docs/adr/*`

## Current implementation status

This starter already includes:
- a runnable FastAPI backend
- SQLite schema bootstrap
- CRUD endpoints for policies, workspaces, agents, schedules, settings
- simulated run execution with logs and artifacts
- pytest coverage for the implemented API surface
- a typed Next.js UI skeleton aligned with the API

Real command execution is intentionally **disabled by default**. Enable it only after hardening the runner and validating policy enforcement.
