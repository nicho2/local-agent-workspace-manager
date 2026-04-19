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

### P2-007 Workspace root directory picker
- replace manual-only `root_path` entry during workspace creation with a directory selection dialog
- keep a fallback text input for environments where native directory selection is unavailable
- validate the selected path against `LAWM_WORKSPACE_ALLOWED_ROOTS` before creation
- surface structured validation errors clearly in the UI
- add frontend coverage for selection/fallback behavior and backend regression coverage for path bounds if the contract changes

### P2-008 Internationalization and language switch
- add an i18n structure for user-facing UI copy
- support French and English as selectable languages from the dashboard
- persist the selected language locally or through settings, depending on the chosen architecture
- ensure navigation, dashboard, workspace, run, schedule, settings, and form labels use translation keys instead of hard-coded copy
- document the i18n approach and add tests for language switching on key pages

### P2-009 Runtime-based default command templates
- when creating or editing an agent, populate `command_template` with a runtime-specific default after selecting `runtime`
- keep user edits intact when switching runtime only after explicit confirmation or when the command field is still untouched
- define safe defaults for supported runtimes such as `copilot_cli`, `codex`, and generic local commands
- document default command templates and keep policy prefix examples aligned
- add frontend tests for default population and preservation of manual edits

### P2-010 Tabbed workspace creation flow
- split the current workspace creation page into clear tabs for workspace, policy, and agent setup
- keep each form focused while preserving the ability to create a complete workspace setup from one area
- make dependencies explicit, for example selecting or creating a policy before attaching it to a workspace
- keep validation and API calls centralized in `lib/api.ts`
- add responsive UI tests for tab navigation and form submission paths

### P2-011 Delete and edit management for workspaces, policies, and agents
- add explicit delete actions for workspaces, policies, and agents
- support deleting a workspace with its dependent agents, schedules, runs, logs, and artifacts only after strong confirmation
- prevent accidental destructive actions with clear warnings and structured errors
- define whether policy and agent deletion is blocked when referenced, archived, or cascaded
- preserve auditability where possible, or document which records are permanently removed
- add backend service tests for dependency handling and frontend tests for confirmation/error flows

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
