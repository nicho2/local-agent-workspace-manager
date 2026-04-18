# AGENTS.md

This file is for coding agents working on this repository.

## 1. Mission

Build and evolve **Local Agent Workspace Manager**, a local-first application used to run AI agents in dedicated workspaces with explicit policies, scheduling, history, logs, and artifacts.

Read these files before changing code:
1. `docs/prd.md`
2. `docs/spec.md`
3. `docs/architecture.md`
4. `docs/backlog.md`
5. relevant ADRs in `docs/adr/`

## 2. Non-negotiable engineering rules

### General
- Keep changes small, explicit, and reviewable.
- Prefer incremental implementation over speculative abstraction.
- Do not introduce a dependency without updating:
  - `docs/spec.md`
  - `README.md`
  - build/runtime instructions if needed
- Do not silently change contracts.
- For every non-trivial change, add or update tests.
- Keep security guardrails intact. Do not weaken runner safety by default.

### Python
- Use **Pydantic v2** models for all external contracts.
- Use type hints everywhere.
- Keep business logic in `services/`, not routers.
- Keep persistence logic isolated from HTTP concerns.
- Prefer `pathlib.Path` over raw string path manipulation.
- For subprocess execution:
  - use explicit argument lists
  - never use `shell=True`
  - always set `cwd`
  - always set `timeout`
  - capture output explicitly
- Return structured errors, not opaque strings.

### FastAPI
- Routers stay thin.
- Validation belongs in Pydantic and service layers.
- Do not hide side effects inside import-time code.
- Startup should bootstrap schema only, not run destructive migrations.

### TypeScript / Next.js
- `strict` mode stays enabled.
- Avoid `any`; use explicit interfaces/types.
- Prefer server components unless client state is required.
- Centralize API calls in `lib/api.ts`.
- Keep components small and composable.
- No large data-fetching logic inside presentational components.

### SQL / persistence
- Schema changes require:
  - migration notes in docs
  - tests covering the new behavior
- Store timestamps in UTC ISO-8601.
- Store structured JSON only where it is genuinely flexible and justified.

### Documentation
- Update docs when behavior changes.
- Add an ADR for structural decisions affecting architecture, deployment, or security.
- Do not leave TODOs without context.

## 3. Required delivery workflow per task

For each implementation:
1. Read the relevant backlog item.
2. Identify the contract to change.
3. Add or update tests first when practical.
4. Implement the smallest correct slice.
5. Run the relevant test subset.
6. Update docs if the behavior or architecture changed.
7. Summarize:
   - what changed
   - what was tested
   - what remains out of scope

## 4. Testing policy

No feature is complete without tests.

Minimum expectations:
- Backend endpoint: pytest coverage
- Backend service rule: unit-level coverage
- Serialization/validation change: schema tests
- Frontend logic branch: Vitest or React Testing Library coverage
- Bug fix: regression test reproducing the failure

## 5. Safety model

The application manages local workspaces and can run commands. That is sensitive.

Therefore:
- execution stays dry-run by default
- policy enforcement must remain explicit
- workspace boundaries must be checked
- logs must be preserved for auditability
- agent runtime identifiers must remain explicit and reviewable

## 6. Preferred implementation order

Unless a task states otherwise:
1. domain/schema
2. service logic
3. router / API contract
4. tests
5. UI integration
6. documentation

## 7. Definition of done

A change is done only if:
- code is typed and readable
- tests pass
- no dead code is introduced
- docs are consistent
- security defaults are preserved
