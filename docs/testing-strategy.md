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

The starter includes a Vitest-ready structure. As UI logic grows:
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
