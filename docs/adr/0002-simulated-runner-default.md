# ADR 0002 — Simulated runner by default

## Status
Accepted

## Decision
Keep agent execution in dry-run mode by default and make real execution depend on an explicit global setting.

## Rationale
The product can trigger local commands inside user-controlled workspaces. Unsafe defaults would create unacceptable operational risk.

## Consequences
- demos remain safe
- audit trail can be built before enabling real execution
- runtime adapters can be introduced gradually
