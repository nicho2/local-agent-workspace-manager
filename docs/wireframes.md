# Wireframes

## Dashboard

```text
+--------------------------------------------------------------+
| Header: Local Agent Workspace Manager                        |
+--------------------------------------------------------------+
| [Workspaces] [Schedules] [Runs] [Settings]                  |
+--------------------------------------------------------------+
| Workspaces | Enabled schedules | Recent runs | Exec mode     |
|     12     |         5         |      24     | dry-run       |
+--------------------------------------------------------------+
| Recent runs                                                   |
| - doc-vault / maintenance / completed                         |
| - repo-triage / review / failed                               |
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
| [Launch]                                                              |
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

```text
+-----------------------------------------------------------------------+
| Run #run_xxx                                                          |
+-----------------------------------------------------------------------+
| Status: completed   Trigger: manual   Dry-run: yes                    |
| Command preview: gh copilot ...                                        |
+-----------------------------------------------------------------------+
| Logs                                                                  |
| [timestamp] INFO Starting run                                         |
| [timestamp] INFO Simulation complete                                  |
+-----------------------------------------------------------------------+
| Artifacts                                                             |
| - summary.md                                                          |
+-----------------------------------------------------------------------+
```
