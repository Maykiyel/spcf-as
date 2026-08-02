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

**Item code**:
A category of billable service or fee (e.g. "GRADUATION FEE", "RENTAL"). Owns a `name` and `description`; has many Services. Managed on its own catalog page, independent of adding Services.
_Avoid_: item, product, SKU

**Service**:
A single priced, sellable variant under an Item code (e.g. "SHS GRADUATION FEE", "AUGUST RENT"). This is the actual unit of inventory — what appears on the Services catalog and what gets charged in a transaction. Its `name` is globally unique and freeform, because it prints verbatim on the receipt with no reference to its parent Item code.
_Avoid_: variant, product, item (an item code is the category; a service is the priced thing)

**Services catalog**:
The day-to-day inventory view — a flattened table, one row per Service, its Item code repeated per row. Supports multi-column sort (max 2, FIFO eviction), an `is_active` filter, inline active-status toggling, and per-row independent editing.
_Avoid_: inventory table, item list

**Item codes catalog**:
The secondary, occasional-upkeep view for managing Item codes directly — create, rename, delete (blocked while Services reference it). Distinct from the Services catalog's inline "create new item code" shortcut, which is a convenience path onto the same underlying data, not a replacement for this catalog.
_Avoid_: category list, item code manager