# Sort-column cap enforced only on the frontend

`useTableControls`'s `nextSorts` caps active sort columns at
`MAX_SORT_COLUMNS` (2 — a primary sort plus one tiebreaker) via FIFO
eviction: clicking a third column drops the oldest one instead of
accumulating unbounded sorts. This cap is enforced entirely client-side,
with no matching backend validation rule.

This was a deliberate choice, not an oversight: the eviction logic makes
the UI self-limiting by construction, so a request exceeding the cap
should never reach the backend in normal use. Adding a backend rule to
enforce the same limit would mean keeping two implementations of a purely
UX-driven constraint in sync, for a case that can't actually occur through
this frontend. Backend sort validation (see `BACKEND_NOTES.md`) is scoped
instead to *which* columns are sortable per endpoint (an allow-list) — a
separate concern from *how many* can be active at once.

## Consequences

Any second consumer of sort behavior that isn't gated by `nextSorts` (a
future direct API integration, a bulk export tool, etc.) needs its own cap
— this one doesn't travel with the request.
