# Backlog

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

## P2 — integrations

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
