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

## Amendment (#65): a list adapter may now exceed the cap deliberately

`getServicesSold` appends `service_name` to whatever sorts it is handed,
so a table already holding two of them sends three keys on the wire. That
is the "second consumer not gated by `nextSorts`" the paragraph above
predicted, arriving from inside this frontend rather than outside it.

It is allowed, and the cap is not raised to cover it. The two are
different limits that happened to share a number. `MAX_SORT_COLUMNS` is a
UX limit on how many sorts a user can hold in their head and manage from
the headers, and appending a key no header shows costs the user nothing.
The wire has no such limit: spatie/laravel-query-builder takes any number
of allow-listed keys.

`/reports/services-sold` is a grouped aggregate with **no `defaultSort`**,
so an unsorted or tie-heavy request paginates unstably, repeating rows on
one page and skipping them on another. `service_name` is the only
allow-listed key on it that is unique. Stabilising that endpoint therefore
needs a key on every request that the header budget cannot be relied on to
carry.

The rule this sets for whoever comes next: a sort key appended by an
adapter for **correctness** does not count against the UI cap. A sort key
a user can see and cycle does.
