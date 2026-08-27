# Backend notes

Reference for the API this frontend talks to. Describes **what the backend
actually returns and enforces** — not why it was built that way.

Source: `spcf-as-backend` (Laravel 12 + Sanctum + spatie/laravel-permission
+ spatie/laravel-query-builder), read at commit `1f26bd8` (2026-08-27).
That repo belongs to the backend developer and is read-only from here; this
file is a transcription of it. When it changes, re-read and update this.

## Response envelope

Every controller response — success or handled error — is wrapped:

```json
{ "success": true, "message": "...", "data": {}, "code": 200 }
```

`apiClient` in `src/lib/axios/api-client.ts` returns this whole object as
`ApiResponse<T>`; fetchers read `.data` off it to get the payload.

A `200` body carrying `success: false` is turned into a rejected
`AxiosError` by the response interceptor, so it surfaces as a failure even
though the HTTP status said otherwise.

Unhandled framework errors (401, 422) do **not** use this envelope — they
return Laravel's own `{ "message": ... }` shape, and 422 adds `errors`.

## Status codes

| Code | When | Body |
|---|---|---|
| 401 | No/invalid session or token (Sanctum default) | `{"message": "Unauthenticated."}` |
| 401 | Bad credentials on `POST /login` | envelope, message `Invalid Credentials` |
| 403 | Policy or role denial | `{"message": "You do not have permission to perform this action."}` |
| 404 | Missing model or route | `{"message": "Resource not found."}` |
| 409 | Action not allowed for the current transaction status | `{"message": ...}` |
| 409 | No active series receipt, or series exhausted | `{"message": ...}` |
| 409 | Saving a transaction that has no items | envelope |
| 419 | Expired CSRF token | Laravel default |
| 422 | Validation failure | `{"message", "errors"}` |
| 400 | Unknown `filter[]` or `sort` key | `{"message": ...}` |

401 and 403 are produced in unrelated places with no fallthrough between
them. `api-client.ts` special-cases only 401 (triggers logout) and 419
(refreshes the CSRF cookie, retries once).

## Auth

Two modes, both Sanctum, selected by `POST /login`:

- **Cookie/session** — when the request carries an `X-XSRF-TOKEN` header.
  The session is regenerated and `data` is the `UserResource` alone.
  Requires `GET /sanctum/csrf-cookie` first.
- **Bearer token** — otherwise. `data` is `{ user, token }`.

`POST /logout` handles both: deletes the personal access token if there is
one, otherwise invalidates the web session.

Roles come from spatie/laravel-permission. `UserResource.role` is the
**first** role name only. A `role:admin` middleware guards series receipts,
activity logs, and reports.

Rate limits: `throttle:login` on login, `throttle:api` on the whole
authenticated group, `throttle:reports` on reports.

## Transactions

### Statuses

`pending`, `abandoned`, `completed`, `cancelled`, `returned`.

### Which actions each status allows

Enforced by `TransactionAction::isAllowedFor`; a violation is **409**.

| Action | Allowed only when status is |
|---|---|
| add / update / delete items | `pending` |
| save | `pending` |
| cancel | `pending` |
| void | `completed` |

A completed transaction can no longer be cancelled or edited, but it **can
be voided by an admin**, moving it to `returned`. A transaction this
frontend has already confirmed is therefore not permanently immutable
server-side.

### Lifecycle

1. `POST /transactions` creates a row with status `pending` and nothing
   else — no customer, no series number. Requires the cashier to hold an
   active, non-exhausted series receipt, else 409.
2. Items are added/updated/deleted against that pending row.
3. `POST /transactions/{id}/save` validates `customer_name` and
   `amount_paid`, re-checks the series receipt, consumes the series number,
   computes `total` server-side from the items, rejects
   `amount_paid < total` as 422, sets `completed_at`, and moves the status
   to `completed`.

`total` and `change_amount` are always computed by the backend. Anything
the frontend computes is for display only.

Adding an item that is already on the transaction **increments the existing
quantity** instead of creating a second row.

### Series numbers

`series_number` is assigned at save time from the cashier's active series
receipt and carries a **unique constraint** across the table. When a series
is used up its status becomes `exhausted` and the cashier's next `queued`
series is promoted to `active` automatically.

## Dashboard

`GET /dashboard` (added in `1f26bd8`). A single invokable controller, not a
resource. Inside the `auth:sanctum` + `throttle:api` group, with **no route
middleware** — it gates itself with `Gate::allowIf($user->hasAnyRole(['cashier',
'admin']))`, so both roles reach it and the failure is a 403 from the Gate
rather than from `role:` middleware.

Response payload (inside the usual envelope):

```json
{ "earnings_today": 0.0, "transactions_today": 0 }
```

Scoping: rows are filtered by `completed_at` falling inside today. A
**cashier** additionally sees only their own (`cashier_id = user.id`); an
**admin** sees every cashier's.

Two things this frontend has to work around — both are backend behaviour,
not bugs to fix from here:

- **The two figures don't count the same rows.** `earnings_today` applies
  the `completed()` scope (`status = completed`); `transactions_today` does
  **not**. A voided transaction keeps its `completed_at`, so it still counts
  toward `transactions_today` while contributing nothing to `earnings_today`.
  The two numbers can therefore disagree, legitimately, and the count is the
  looser of the two.
- **"Today" is a UTC day.** `config/app.php` sets `'timezone' => 'UTC'`, so
  `today()` is UTC midnight, not Manila midnight. In UTC+8 that window is
  08:00 local to 08:00 the next day — meaning transactions taken before 08:00
  Manila fall into the *previous* dashboard day.

## Response shapes

### `TransactionResource`

Returned by `show`, `save`, `cancel`, `void`, and each row of `index`.
Mirrored by `TransactionDTO` in `src/features/transactions/types/index.ts`.

| Field | Source | Notes |
|---|---|---|
| `control_id` | `id` | the primary key, renamed |
| `cashier` | relation | `{id, full_name}`; **omitted** unless eager-loaded |
| `series_number` | column | `null` until saved |
| `customer_name` | column | `null` until saved |
| `items` | relation | omitted unless eager-loaded |
| `total` | column | cast to float |
| `amount_paid` | column | cast to float |
| `change_amount` | column | cast to float |
| `status` | enum | one of the five above |
| `date` | **`created_at`** | full ISO-8601 timestamp, e.g. `2026-08-24T06:30:00.000000Z` |

**`date` is `created_at`, not `completed_at`** — it is when the transaction
was *initiated*, not when payment was confirmed. It is always a full
timestamp; there is no date-only field anywhere in this API.

`POST /transactions` is the exception to all of the above: it returns a
hand-built `{id, status, cashier}` object rather than a
`TransactionResource`, and its id key is `id`, not `control_id`.

### `TransactionItemResource`

| Field | Notes |
|---|---|
| `id` | |
| `name` | from `service_name`, snapshotted when the item was added |
| `price` | omitted when null |
| `quantity` | omitted when null |
| `subtotal` | omitted when null |

The `index` endpoint selects only `id, service_name, transaction_id,
subtotal`, so `price` and `quantity` are **absent from list rows** and
present on `show`.

Because `service_name` is stored on the item, renaming a Service later does
not change what past transactions display.

### `SeriesReceiptResource`

`id`, `account` (`{id, full_name}` — the assigned cashier; the backend
names this relation `account`), `from`, `to`, `remaining_sheets`,
`createdBy`, `status`.

### `UserResource`

`id`, `first_name`, `last_name`, `full_name`, `user_name` (from
`username`), `email`, `role`. Every field except `id` is omitted when null;
`role` requires the roles relation to be loaded.

## Authorization

| Endpoint | Rule |
|---|---|
| `GET /transactions` | admin or cashier; cashiers see only their own rows |
| `GET /transactions/{id}` | admin, **or** the owning cashier — else 403 |
| `POST /transactions` | cashier only (admins cannot create) |
| save / cancel | owning cashier only |
| void | admin only |
| series receipts, activity logs, reports | admin only |

`filter[cashier_id]` on the index endpoint is accepted **only** for admins.
For a cashier it is not in the allowed list, so it returns 400.

## Date filters are strict `Y-m-d`

Changed in `d022464`. Every `filter[from_date]` / `filter[to_date]` in the
API was validated with Laravel's loose `date` rule, which accepted anything
`Carbon` could parse. They are now `Rule::date()->format('Y-m-d')`, so the
**only** accepted form is a date-only string like `2026-08-27`. Anything
else — an ISO-8601 timestamp, `27/08/2026`, `Aug 27 2026` — is a **422**.

Applies to:

| Endpoint | `from_date` / `to_date` |
|---|---|
| `GET /transactions` | optional |
| `GET /activity-logs` | optional |
| `GET /reports/services-sold` | optional |
| `GET /reports/services-sold/{service}` | **both required** |
| `GET /reports/transactions` | optional |

`to_date` additionally carries `after_or_equal:from_date` everywhere.

**The trap:** responses are asymmetric with requests. `TransactionResource.date`
comes back as a full ISO-8601 timestamp (`2026-08-24T06:30:00.000000Z`), but
that value cannot be sent back as a filter — it has to be truncated to its
date part first. A value read from a response is never directly reusable as
a date filter.

## Index query parameters

Powered by spatie/laravel-query-builder.

- Filters: `series_number`, `customer` (partial match on `customer_name`),
  `status`, `from_date`, `to_date` (both `Y-m-d` only — see above),
  `item_name` (partial match on item `service_name`), and `cashier_id`
  (admin only).
- Sorts: `created_at`, `status`, `customer` (maps to `customer_name`),
  `series_number`. Default is `-created_at`.
- Pagination: `per_page`; the response carries
  `{current_page, total_pages, count, per_page, total}`.

An unknown filter or sort key is a **400**, not a silently ignored
parameter.

## Endpoints

```
POST   /login                                   (throttled)
POST   /logout
GET    /dashboard
GET    /users/me
GET    /users            POST /users            GET /users/{id}
       /suppliers        (full apiResource)
       /item-codes       (full apiResource)
       /services         (full apiResource)
PATCH  /services/{service}/active-status
GET    /transactions     POST /transactions     GET /transactions/{id}
POST   /transactions/{id}/save
POST   /transactions/{id}/cancel
POST   /transactions/{id}/void
GET    /transactions/{id}/items
POST   /transactions/{id}/items
GET    /transactions/{id}/items/{item}
PATCH  /transactions/{id}/items/{item}
DELETE /transactions/{id}/items/{item}
GET    /series-receipts  POST /series-receipts             (admin)
GET    /series-receipts/latest-from                        (admin)
GET    /activity-logs    GET /activity-logs/{activity}     (admin)
GET    /reports/services-sold                              (admin)
GET    /reports/services-sold/{service}                    (admin)
GET    /reports/transactions                               (admin)
```

There is no student or payer model — `customer_name` is a free-text string
on the transaction, consistent with ADR 0001.

`PUT/PATCH` and `DELETE` exist for suppliers, item codes and services via
`apiResource`, but there is no update or delete endpoint for a transaction
itself — only the save/cancel/void state transitions.
