# Testing Strategy

## Goals

Ensure every implemented capability is:
- validated through automated tests
- protected against regressions
- safe to extend incrementally

## Backend

Use `pytest` and FastAPI `TestClient`.

Coverage baseline for this starter:
- health
- policy creation/listing
- workspace creation/listing/get
- agent creation/listing
- schedule validation and creation
- manual dry-run execution
- settings read/update

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

As UI logic grows:
- test API client helpers
- test client-side components with meaningful state
- keep presentation-only components thin

## Test data

- use isolated temporary SQLite databases
- prefer explicit fixtures over global mutable state
- do not depend on execution against real local repositories for unit/integration tests

## Regression policy

Every bug fix must add:
- one reproducing test
- one assertion guarding the intended corrected behavior
