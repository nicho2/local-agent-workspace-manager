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

## Post-MVP delivered

### P2-007 Workspace root directory picker
- workspace creation/editing includes a directory picker action next to
  `root_path`
- manual path entry remains available for browsers that cannot expose an
  absolute selected path
- allowed roots are exposed through `GET /workspaces/allowed-roots` so the UI
  can compose `allowed_root + selected_folder_name` when the browser hides the
  full path
- backend structured errors for paths outside allowed roots are surfaced with
  the allowed roots context when available

### P2-012 Runtime capability presets
- central runtime capability presets are available through
  `GET /agents/runtime-presets`
- initial presets cover `copilot_cli`, `codex`, and `local_command`
- presets expose default command templates, dry-run support, write/network
  expectations, recommended policy prefixes, and environment defaults
- real execution remains guarded by the global setting and policy prefix checks

### P2-009 Runtime-based default command templates
- agent creation/editing reads runtime presets from the API
- selecting a runtime pre-fills `command_template` while the field is empty or
  untouched
- manually edited command templates are preserved when switching runtime

### P2-010 Tabbed workspace creation flow
- workspace creation/editing now uses accessible tabs for Workspace, Policy,
  and Agent setup
- the active tab presents one focused form while preserving the existing
  create/edit workflows
- keyboard navigation supports arrow keys plus Home/End

### P2-008 Internationalization and language switch
- frontend dictionaries support English and French user-facing labels
- the dashboard exposes a language selector persisted in browser local storage
- navigation, dashboard, workspace, run, schedule, settings, table headings, and
  primary form labels use translation keys
- raw logs, technical identifiers, API statuses, and backend error messages stay
  unchanged for auditability

### P2-014 Run safety preview before launch
- `POST /runs/preview` returns a read-only launch summary without creating a run
- manual launch shows workspace name, slug, root path, agent, runtime, exact
  command, mode, policy, allowed prefixes, write/network flags, and expected
  blocking reasons
- the UI states explicitly which agent will launch in which workspace before
  submission
- dry-run remains the default path, and real execution requires an explicit
  confirmation checkbox

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

### P2-011 Delete and edit management for workspaces, policies, and agents
- add explicit delete actions for workspaces, policies, and agents
- support deleting a workspace with its dependent agents, schedules, runs, logs, and artifacts only after strong confirmation
- prevent accidental destructive actions with clear warnings and structured errors
- define whether policy and agent deletion is blocked when referenced, archived, or cascaded
- preserve auditability where possible, or document which records are permanently removed
- add backend service tests for dependency handling and frontend tests for confirmation/error flows

### P2-013 Guided workspace setup wizard
- provide a guided path to create a ready-to-run workspace setup
- combine directory selection, workspace metadata, policy choice, agent preset, and safety recap
- support common use cases such as documentation maintenance, repository triage, Obsidian vault cleanup, and backlog review
- keep the existing granular create/edit forms available for advanced use
- add tests for the happy path and validation failures

### P2-015 Safety center dashboard
- add a safety-oriented view summarizing execution posture
- show real-execution status, allowed workspace roots, permissive policies, active agents, active schedules, and recent blocked/failed runs
- highlight risky configuration combinations without changing settings automatically
- link each finding to the relevant settings, policy, agent, schedule, or run detail page
- document the safety center as an operational review tool

### P2-016 Human-readable audit timeline
- add a timeline view for run detail pages
- translate technical logs into key audit steps such as request received, workspace validated, agent validated, policy checked, execution blocked/started/completed, and artifact created
- preserve raw logs for detailed inspection
- ensure blocked and failed runs explain the decisive reason
- add backend or frontend tests depending on where the timeline is derived

### P2-017 Empty-state onboarding and demo seed shortcut
- improve empty states for first use
- explain dry-run defaults, allowed roots, demo data, and the next recommended action
- provide a safe shortcut or documented path to initialize demo data
- guide users from an empty dashboard to workspace creation or demo exploration
- add frontend tests for empty dashboard/workspace states

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
