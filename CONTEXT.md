# Project context

This repository is a Vite + React + TypeScript application for the SPCF AS project.

## Current stack

- Vite
- React
- TypeScript
- Oxlint

## Working conventions

- Keep changes focused and well-scoped.
- Prefer small, verifiable updates.
- Update architecture decisions in `docs/adr/` when they materially change.

## Language

**Auth session module**:
The single interface (`login`, `restore`, `logout`) that owns all writes to the auth store. UI, route guards, and the HTTP client call it; nothing else calls the store's setters directly.
_Avoid_: auth store (that's the state container it manages, not the module itself), auth context
