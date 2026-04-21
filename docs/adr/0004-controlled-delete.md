# ADR 0004 - Controlled Delete Rules

## Status

Accepted.

## Context

Local Agent Workspace Manager stores workspace metadata, scoped agents,
schedules, run history, logs, and file artifacts. Deleting these records is
destructive and can remove audit evidence. At the same time, local operators
need a way to clean temporary setups created during experimentation.

## Decision

Deletion is explicit and conservative:

- Workspace deletion requires exact slug confirmation.
- A confirmed workspace deletion cascades its workspace-scoped agents,
  schedules, runs, run logs, run artifact records, and artifact files stored
  under the configured artifacts root.
- Policy deletion is blocked while any workspace references the policy.
- Agent deletion is blocked while any schedule or run references the agent.
- Archive remains the non-destructive workspace alternative.
- Delete APIs return a structured summary of deleted counts.
- Blocked deletes return structured errors with dependency counts.

## Consequences

The application avoids silent loss of audit history. The one destructive cascade
is limited to an explicitly confirmed workspace boundary, which matches the
product model that a workspace is the local execution boundary.

Users can still clean up unreferenced policies and agents without manual
database edits. More advanced retention, restore, or trash-bin behavior remains
future work.
