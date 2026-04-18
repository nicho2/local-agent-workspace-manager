# ADR 0001 — Monorepo and local-first stack

## Status
Accepted

## Decision
Use a monorepo with:
- `apps/api` for FastAPI
- `apps/web` for Next.js
- `docs/` for product and architecture material
- `storage/` for runtime state
- `examples/` for sample workspaces and policies

## Rationale
The product is small enough that one repository reduces coordination cost and keeps contracts visible across UI, API, and documentation.

## Consequences
- easier local setup
- easier agent context loading
- stronger coupling between apps, which is acceptable at this stage
