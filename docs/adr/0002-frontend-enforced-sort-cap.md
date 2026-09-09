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

## Amendment (#65): a client tiebreaker was added, then removed again

`/reports/services-sold` groups transaction items and had no ordering of
its own, so paginating a sort that ties repeated rows on one page and
skipped them on another. `getServicesSold` briefly appended `service_name`
to every request to stabilise it, which put three sort keys on the wire
whenever the user already held two, and so broke the claim above that a
request exceeding the cap never reaches the backend.

Backend `0428e2c` fixed it at the source with an unconditional
`orderBy('service_id')` after `allowedSorts()`, so the client append is
gone and this ADR stands unamended in practice.

Recorded because the question will come back. If a client ever has to
append a sort key for correctness again, the answer that held here was
that it is allowed and the cap is not raised to cover it. They are two
different limits sharing a number: `MAX_SORT_COLUMNS` bounds what a user
can juggle from the headers, and a key no header shows costs the user
nothing. Prefer fixing the endpoint, as happened here.
