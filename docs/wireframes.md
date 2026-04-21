# Wireframes

## Dashboard

```text
+--------------------------------------------------------------+
| Header: Local Agent Workspace Manager                        |
+--------------------------------------------------------------+
| [Workspaces] [Schedules] [Runs] [Safety] [Settings]         |
+--------------------------------------------------------------+
| Language: [English v]                                        |
+--------------------------------------------------------------+
| Workspaces | Enabled schedules | Recent runs | Exec mode     |
|     12     |         5         |      24     | dry-run       |
+--------------------------------------------------------------+
| Recent runs                                                   |
| - doc-vault / maintenance / completed                         |
| - repo-triage / review / failed                               |
+--------------------------------------------------------------+
```

Empty state:

```text
+--------------------------------------------------------------+
| Start safely                                                 |
| Create a workspace, keep first launch in dry-run, or seed    |
| demo data from the terminal.                                 |
| Allowed roots: E:/temp                                       |
| Demo seed: py -3.12 scripts/seed_demo.py                     |
| [Create workspace] [Review execution setting] [Safety Center]|
+--------------------------------------------------------------+
```

## Workspaces list

```text
+-----------------------------------------------------------------------+
| Create and edit                                                       |
| [Workspace] [Policy] [Agent]                                          |
| Active tab shows one focused form                                     |
| Workspace root path: [Choose directory] + manual path fallback        |
| Agent runtime selection pre-fills command template until user edits it |
+-----------------------------------------------------------------------+
| Search [.........................]                                    |
+-----------------------------------------------------------------------+
| Name            | Policy        | Root path                | Status    |
| Docs Vault      | default-safe  | D:/vaults/docs          | active    |
| Repo Triage     | repo-review   | D:/repos/project-x      | active    |
+-----------------------------------------------------------------------+
```

Empty state:

```text
+-----------------------------------------------------------------------+
| Start safely                                                          |
| No workspace exists yet. Create one under an allowed root first.       |
| Allowed roots: E:/temp                                                |
| Demo seed: py -3.12 scripts/seed_demo.py                              |
| [Review execution setting] [Safety Center]                            |
+-----------------------------------------------------------------------+
```

## Schedules

```text
+-----------------------------------------------------------------------+
| Create and edit schedule                                              |
| Name | Workspace | Agent | Mode | Interval | Enabled                  |
+-----------------------------------------------------------------------+
| Configured schedules                                                  |
| Name            | Mode       | Agent              | Enabled | Next run |
| nightly-docs    | interval   | maintenance-agent  | yes     | ...      |
+-----------------------------------------------------------------------+
```

Empty state:

```text
+-----------------------------------------------------------------------+
| No schedules yet.                                                     |
| Create a workspace and agent, then add an interval schedule after the  |
| dry-run path is clear.                                                |
| [Create workspace] [Safety Center]                                    |
+-----------------------------------------------------------------------+
```

## Settings

```text
+-----------------------------------------------------------------------+
| Execution control                                                     |
| Warning: real execution can run local commands                         |
| [ ] Enable real execution globally                                     |
| [Save execution setting]                                               |
+-----------------------------------------------------------------------+
| Settings                                                              |
| Key                       | Value | Description                        |
| runner.execution_enabled  | false | Global switch ...                  |
+-----------------------------------------------------------------------+
```

## Safety Center

```text
+-----------------------------------------------------------------------+
| Safety Center                                      [Review settings]   |
| Read-only posture. Guarded runner, not an OS sandbox.                 |
+-----------------------------------------------------------------------+
| Real execution | Allowed roots | Permissive policies | Attention runs |
| dry-run        |      2        |          1          |       2        |
+-----------------------------------------------------------------------+
| Allowed roots                                                         |
| - E:/temp                                                             |
+-----------------------------------------------------------------------+
| Permissive policies                         [Review workspaces]        |
| Name          | write/network | prefixes                              |
| default-safe  | write+network | copilot, python -m pytest, npm test   |
+-----------------------------------------------------------------------+
| Active agents                                                         |
| Agent         | Runtime      | Workspace scope                        |
| docs-agent    | copilot_cli  | Docs Vault                             |
+-----------------------------------------------------------------------+
| Active schedules                         [Review schedules]           |
| Name          | Mode     | Workspace | Agent      | Next run          |
| nightly-docs  | interval | Docs Vault| docs-agent | ...               |
+-----------------------------------------------------------------------+
| Blocked and failed runs                                               |
| Run          | Status  | Workspace | Agent      | Started            |
| [Open run]   | blocked | Docs Vault| docs-agent | ...                |
+-----------------------------------------------------------------------+
```

## Workspace detail

```text
+-----------------------------------------------------------------------+
| Workspace: Docs Vault                                                 |
+-----------------------------------------------------------------------+
| [Execution] [Agent] [Policy] [Scheduling] [History]                   |
+-----------------------------------------------------------------------+
| Manual run panel                                                      |
| Agent: maintenance-copilot                                            |
| Mode: [x] dry-run                                                     |
| Safety preview                                                        |
| - Agent maintenance-copilot will launch in workspace Docs Vault        |
| - Root: D:/vaults/docs                                                |
| - Command: copilot --agent wiki-maintenance ...                       |
| - Policy: default-safe / prefixes / write denied / network denied      |
| [Launch dry-run]                                                      |
| Success opens /runs/{runId}                                           |
+-----------------------------------------------------------------------+
| Agent                                                                 |
| - active and global profiles available to the workspace                |
+-----------------------------------------------------------------------+
| Policy                                                                |
| - runtime limit, write/network guardrails, command prefixes            |
+-----------------------------------------------------------------------+
| Scheduling                                                            |
| - enabled interval schedules and next run times                        |
+-----------------------------------------------------------------------+
| History                                                               |
| - recent runs linked to run detail                                     |
+-----------------------------------------------------------------------+
```

## Run detail

## Runs list

```text
+-----------------------------------------------------------------------+
| Runs                                                                  |
+-----------------------------------------------------------------------+
| Run              | Status       | Trigger      | Dry-run | Started     |
| run_xxx          | completed    | manual       | yes     | ...         |
| run_yyy          | blocked      | schedule     | yes     | ...         |
+-----------------------------------------------------------------------+
```

Empty state:

```text
+-----------------------------------------------------------------------+
| No runs yet.                                                          |
| Launch a manual dry-run from a workspace detail page first.            |
| [Create workspace] [Safety Center]                                    |
+-----------------------------------------------------------------------+
```

```text
+-----------------------------------------------------------------------+
| Run #run_xxx                                                          |
+-----------------------------------------------------------------------+
| Status: completed   Trigger: manual   Dry-run: yes                    |
| Command preview: copilot --agent ...                                   |
+-----------------------------------------------------------------------+
| Audit timeline                                                        |
| 1. Request received - manual request from web-ui                       |
| 2. Command captured - copilot --agent ...                              |
| 3. Dry-run completed - no real command was executed                    |
| 4. Artifacts recorded - summary.md                                     |
+-----------------------------------------------------------------------+
| Logs                                                                  |
| [timestamp] INFO Starting run                                         |
| [timestamp] INFO Simulation complete                                  |
+-----------------------------------------------------------------------+
| Artifacts                                                             |
| - summary.md                                                          |
+-----------------------------------------------------------------------+
```
