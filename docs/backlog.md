# Backlog

## MVP status

The MVP scope tracked in `docs/tasks.md` is delivered. The delivered set
includes the local FastAPI API, Next.js UI, SQLite persistence, bounded
workspaces, structured service errors, create/edit flows, manual dry-runs, run
history with logs and artifacts, settings, guarded real execution, an optional
interval schedule worker, demo seed data, and automated MVP flow coverage.

## MVP remaining

No open MVP delivery item remains. Future work should be planned as post-MVP
unless it fixes a regression in the delivered safety or audit behavior.

## Post-MVP backlog

### P2-001 Full cron scheduling
- parse cron expressions
- compute `next_run_at`
- execute due cron schedules with the same audit and safety model

### P2-002 GitHub Copilot CLI runtime
- runtime adapter
- command builder
- policy compatibility layer

### P2-003 Codex runtime
- runtime adapter
- prompt file strategy
- artifact conventions

### P2-004 Obsidian workspace starter
- vault-oriented defaults
- maintenance agent template

### P2-005 Security hardening
- authentication / RBAC
- secret references or external secrets integration
- per-run file change tracking
- OS-level sandboxing or container-per-run isolation

### P2-006 Operations hardening
- retention policy enforcement
- export/import of audit records
- richer filtering and pagination for run history
- CI coverage for full-stack smoke checks

## Delivered historical backlog

## P0 — foundation

### P0-001 Monorepo bootstrap
- create root structure
- add README, PRD, spec, architecture, ADRs
- add AGENTS.md
- add storage and examples directories

### P0-002 FastAPI skeleton
- application factory
- settings
- health route
- schema bootstrap
- pytest baseline

### P0-003 Core domain models
- policies
- workspaces
- agents
- schedules
- runs
- logs
- artifacts
- system settings

### P0-004 CRUD API
- policies endpoints
- workspaces endpoints
- agents endpoints
- schedules endpoints
- settings endpoints

### P0-005 Simulated runner
- manual run endpoint
- command preview
- log generation
- artifact generation
- dry-run semantics

### P0-006 Dashboard summary endpoint
- counts
- recent runs
- execution-enabled status

## P1 — operational hardening

### P1-001 Real execution gate
- explicit global flag
- policy compatibility checks
- timeout handling
- non-zero exit management

### P1-002 Workspace boundary enforcement
- normalize paths
- reject roots outside allowed base directories
- add regression tests

### P1-003 Schedule worker
- background polling loop or APScheduler integration
- persisted next run updates
- deduplication guard

### P1-004 Run detail UX
- logs view
- artifacts list
- run state filtering

### P1-005 Workspace detail UX
- tabbed layout
- embedded run launch action
- schedule list

## Original integration ideas

### P2-001 GitHub Copilot CLI runtime
- runtime adapter
- command builder
- policy compatibility layer

### P2-002 Codex runtime
- runtime adapter
- prompt file strategy
- artifact conventions

### P2-003 Obsidian workspace starter
- vault-oriented defaults
- maintenance agent template

## Codex-ready execution pattern

For each task:
1. restate scope
2. identify files to touch
3. add or update tests
4. implement minimal slice
5. run tests
6. update docs if contracts changed
