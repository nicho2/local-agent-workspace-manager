# Testing Strategy

## Goals

Ensure every implemented capability is:
- validated through automated tests
- protected against regressions
- safe to extend incrementally

## Backend

Use `pytest` and FastAPI `TestClient`.

Coverage baseline for the MVP:
- health and dashboard summary
- policy creation, listing, editing, validation, and conflicts
- workspace creation, listing, detail, editing, archive status, and root bounds
- agent creation, listing, editing, workspace binding, and inactive-run refusal
- schedule creation, editing, activation/deactivation, interval validation, and
  due schedule processing
- manual dry-run execution and guarded real execution outcomes
- run history, detail, logs, and artifacts
- settings read/update and `runner.execution_enabled` behavior
- idempotent demo seed and the lightweight end-to-end MVP flow

## Frontend

Use `vitest run` for lightweight frontend checks. The current suite renders
server components to static HTML with mocked API responses so the MVP navigation
and run-history flow stay covered without adding a browser dependency.

Coverage baseline:
- top navigation links to the main MVP sections
- dashboard recent runs link to run detail pages
- runs list shows status, trigger, dry-run state, and detail links
- run detail shows metadata, command preview, logs, and artifacts
- workspaces list links to workspace detail pages
- workspace detail shows execution, agent, policy, scheduling, and history sections
- manual run creation posts the expected dry-run payload
- MVP create/edit forms render for workspaces, policies, agents, and schedules
- API client POST/PUT contracts are covered for workspace, policy, agent, schedule, and run creation
- settings page shows the real-execution warning and settings table
- empty dashboard and workspace states explain allowed roots, demo seed, dry-run
  defaults, and next navigation actions
- runner execution setting updates are reflected by the dashboard

As UI logic grows:
- test API client helpers
- test client-side components with meaningful state
- keep presentation-only components thin

## Test data

- use isolated temporary SQLite databases
- prefer explicit fixtures over global mutable state
- do not depend on execution against real local repositories for unit/integration tests

## MVP verification path

Automated lightweight path:

```bash
cd apps/api
python -m pytest tests/test_mvp_flow.py
```

This path seeds the demo dataset in a temporary SQLite database, verifies two
demo workspaces, agents and disabled schedules, launches a manual dry-run,
checks logs and artifacts, confirms the run appears in the dashboard, and
confirms disabled schedules do not trigger additional runs.

Manual local path:

1. From the repository root, run `py -3.12 scripts/seed_demo.py`.
2. Start the API from `apps/api` with `python -m uvicorn app.main:app --reload`.
3. Start the web app from `apps/web` with `npm run dev`.
4. Open the dashboard and confirm execution mode is dry-run / disabled.
5. Open Workspaces and confirm `Demo Maintenance` and `Repo Triage` exist.
6. Open a workspace detail page and confirm Execution, Agent, Policy, Scheduling and History are visible.
7. Launch a manual dry-run from the workspace detail page.
8. Confirm the app opens the run detail page with metadata, logs and `summary.md`.
9. Open Schedules and confirm demo schedules are disabled by default.
10. Open Settings and confirm real execution remains disabled unless explicitly changed.
11. On an empty database, open Dashboard and Workspaces and confirm the empty
    states point to workspace creation, Settings, Safety Center, and
    `py -3.12 scripts/seed_demo.py`.

## Regression policy

Every bug fix must add:
- one reproducing test
- one assertion guarding the intended corrected behavior
