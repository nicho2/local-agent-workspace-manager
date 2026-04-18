# PRD — Local Agent Workspace Manager

## 1. Product summary

Local Agent Workspace Manager is a local-first application used to launch, supervise, and audit AI-agent runs inside explicitly scoped workspaces.

The product addresses a concrete operational need:
- one workspace = one bounded context
- one or more agent profiles per workspace
- manual or scheduled execution
- reproducible history with logs and artifacts
- safety-first defaults before real execution is enabled

## 2. Problem statement

Existing agent tooling is often:
- too opaque
- too permissive
- tied to one environment
- weak on auditability
- difficult to operate across multiple project-centric workspaces

The target product must provide a simple control plane over local workspaces and agent executions, without requiring a heavyweight multi-tenant orchestration platform.

## 3. Goals

### Primary goals
1. Create and manage workspaces.
2. Attach agent profiles and policies.
3. Run agents manually.
4. Schedule repeated executions.
5. Keep logs, artifacts, and run history.
6. Make the system safe enough for local operational use.

### Secondary goals
- Prepare future support for GitHub Copilot CLI / ACP integration.
- Make the UI understandable for a technical but non-platform-specialist user.
- Keep deployment lightweight.

## 4. Non-goals for V1
- distributed execution
- multi-user RBAC
- remote secrets vault
- container-per-run isolation
- large-scale orchestration
- autonomous long-running agents without explicit policy review

## 5. Users

### Primary user
Technical operator / developer / architect managing several project repositories or vault-style workspaces locally.

### Typical scenarios
- run a maintenance agent inside an Obsidian vault
- run triage on a documentation repository
- periodically review a codebase or backlog
- inspect logs and artifacts after execution

## 6. Key entities

- Workspace
- AgentProfile
- WorkspacePolicy
- Schedule
- Run
- RunLog
- RunArtifact
- SystemSetting

## 7. Functional requirements

### FR-1 Dashboard
Show:
- total workspaces
- enabled schedules
- recent runs
- last failures
- execution mode status

### FR-2 Workspace management
User can:
- create a workspace
- edit metadata
- attach a policy
- see recent runs
- archive a workspace later

### FR-3 Agent profile management
User can:
- define a runtime
- define a command template
- attach environment variables
- mark a profile as active/inactive

### FR-4 Policy management
User can:
- define execution limits
- allow/deny write access
- allow/deny network access
- define allowed command prefixes

### FR-5 Manual runs
User can:
- trigger a run
- choose workspace + agent
- request dry-run or real execution
- inspect resulting logs and artifacts

### FR-6 Scheduling
User can:
- create interval or cron-like schedules
- enable/disable schedules
- inspect next planned run

### FR-7 History and observability
System stores:
- run metadata
- logs
- output artifacts
- timestamps
- trigger source

### FR-8 Settings
System exposes:
- execution enabled flag
- storage roots
- future runtime settings

## 8. UX requirements

The UI must include:
- dashboard
- workspaces list
- workspace detail tabs: execution / agent / policy / scheduling / history
- run detail
- schedule view
- system settings

## 9. Success criteria

V1 is successful if a user can:
1. create two workspaces
2. attach policies and agents
3. launch manual dry-runs
4. review logs and artifacts
5. configure recurring schedules
6. trust the audit trail

## 10. Risks

- unsafe command execution
- weak policy enforcement
- scheduler drift
- ambiguous workspace boundaries
- frontend complexity before backend contracts stabilize

## 11. Release recommendation

Release V1 as:
- local web application
- SQLite-backed
- dry-run by default
- single-machine scope
