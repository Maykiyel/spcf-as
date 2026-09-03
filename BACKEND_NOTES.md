# Backend notes

Reference for the API this frontend talks to. Describes **what the backend
actually returns and enforces** — not why it was built that way.

Source: `spcf-as-backend` (Laravel 12 + Sanctum + spatie/laravel-permission
+ spatie/laravel-query-builder), read at commit `0d81988` (2026-09-03).
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

**`abandoned` is reachable as of `fbbb77f`.** `POST /transactions` now
abandons every one of that cashier's `pending` transactions before creating
the new one, writing a `TRANSACTION_ABANDONED` activity entry for each. It
was previously a declared-but-unused state.

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

## Account active status (`fbbb77f`)

Users now carry `is_active`. `EnsureAccountIsActive` is applied to the
**entire** authenticated group and to the reports group, so a deactivated
user is rejected on **every** endpoint with:

```json
{ "message": "User account is deactivated. Please ask admin to activate your account." }
```

**HTTP 403, in Laravel's plain shape — not the success envelope.**

**Four unrelated things return 403, and only the message separates them:**

| Where | Message | Means |
|---|---|---|
| `EnsureAccountIsActive` (every endpoint) | `User account is deactivated. Please ask admin to activate your account.` | the caller's own account is switched off |
| `AuthController@login` | `User account is deactivated. Please ask an admin to activate your account.` | same, on a sign-in attempt. Envelope shape, and note `ask an admin` where the middleware says `ask admin` |
| `bootstrap/app.php` exception handler | `You do not have permission to perform this action.` | policy or role denial on one resource |
| `SeriesReceiptController@store` | `Cannot assign Series Receipt to inactive cashier account` | somebody *else's* account is off, on the admin's own working session |

The first two mean "end this session"; the last two do not, and the
fourth is about an account being inactive without being the caller's, so
matching on the word "deactivated" alone is closer to a collision than it
looks. `src/lib/axios/api-client.ts` matches the phrase
`user account is deactivated` and exempts `POST /login`.

A deactivated user still keeps a token that authenticates — nothing on the
server revokes it. Signing them out is entirely the client's doing, which
is why it happens on their next request rather than the moment an admin
deactivates them.

## Users: delete and toggle status (`a96743a`, `8a5fb1c`)

```
DELETE /users/{user}                  (admin)
PATCH  /users/{user}/toggle-status    (admin)  body: {"is_active": bool}
```

- **Delete is conditional.** `canBeDeleted()` blocks a user holding any
  related records — transactions, series receipts, accounts they created,
  transactions they voided. Refusal is a **422** with
  `{"message": "User cannot be deleted because they have existing related records."}`
  in the plain shape. In practice any cashier who has ever worked is
  undeletable, so treat delete as available only for mistakenly-created
  accounts.
- **Toggle cascades to series receipts.** Deactivating a cashier moves
  their `active` series to `suspended`; reactivating moves a `suspended`
  series back to `active`. `SeriesReceiptStatus` is now
  `queued | active | exhausted | suspended`.
- Returns the updated `UserResource`, which now includes `is_active`.
- There is still **no update endpoint** — no rename, no role change, no
  password reset.

## Users: the index was rewritten (`4955f19` through `0d81988`)

```
GET /users     (admin only now)
GET /cashiers  (admin)
```

`GET /users` was unpaginated, served both roles, took a `fields[]`
parameter and returned a flat array. All four are gone.

- **Admin only.** `UserPolicy@viewAny` was `hasAnyRole(['admin',
  'cashier'])` and is now `hasAnyRole(['admin'])`. A cashier gets a 403.
- **Paginated**, in the standard envelope: `{users: [...], pagination:
  {...}}`. 25 per page by default, 100 max, from `config/pagination.php`.
- **No `fields[]`.** The whole resource comes back every time.
- **Filters** are `role` (`admin`|`cashier`) and `is_active`. `is_active`
  is spatie's default *partial* match, so `filter[is_active]=1` and `=0`
  are the working forms — the same shape `/services` takes.
- **Sorts** are `first_name`, `last_name`, `full_name`, `username`.
  `email` and `created_at` are gone from the allow list.
- **No `filter[search]`**, still.
- **No default sort**, so an unsorted request returns rows in whatever
  order the database gives, which is not stable across pages. The Manage
  Accounts table sends `full_name` rather than relying on it.

`GET /cashiers` is new and unpaginated: an array of `{id, full_name}`
ordered by `full_name`, in the envelope. It takes an optional
`is_active` — a **plain query parameter, not `filter[is_active]`**,
validated `['sometimes', 'boolean']` at the top level rather than under a
`filter` key like everything else here. It is what the series-receipt
cashier picker uses, with `is_active=1`, because `POST /series-receipts`
answers an inactive cashier with a 403 (`Cannot assign Series Receipt to
inactive cashier account`).

Its two fields come from `CashierResource` as of `a474c13`, where they
used to come from a `->get(['id', 'full_name'])` column select. Same shape
either way, but the resource is the more stable of the two: a column added
to the select would have leaked into the response, and now it cannot.

`email` is fully gone: no column, no `$fillable` entry, no `UserResource`
field, and as of `0cecdbd` no `store` validation rule or write either.
`Supplier` still has one; that is a different model.

### Three bugs this rewrite shipped, all since fixed

Recorded because each was silent, and two of them would come back the
same way.

1. **`role` went missing from `GET /users`.** `UserResource.role` is
   `whenLoaded('roles')`, and `4955f19` dropped the `->with('roles')` the
   old index did, so the key was absent from every row. `e660349`
   restored it as `$users->load('roles')` after `paginate()`. **It still
   hangs on that one line**, and nothing on either side fails loudly if
   it goes: the backend's own structure assertion does not name `role`.
2. **`POST /users` was a SQL error.** `store` kept validating
   `'email' => [..., 'unique:users,email']` and writing `email` after
   `4955f19` dropped the column, so the unique rule queried a column that
   no longer existed. Invisible to their suite, whose `store` payload has
   no email and so 422s first. Fixed in `0cecdbd`. (The `email` column
   still in that migration file belongs to `password_reset_tokens`.)
3. **`per_page` was validated and then discarded.** `index` called
   `$request->validate([...])` without assigning it, then read
   `$validated['per_page']`. Undefined variable, so the expression was
   always the config default. Silent because `??` has `isset()`
   semantics and suppresses the warning — without it, Laravel's
   `HandleExceptions` (which sets `error_reporting(-1)`) would have
   thrown an `ErrorException` and made it a 500. Fixed in `0cecdbd`.

## Earnings reports (`fbbb77f`)

Both admin-only, under `throttle:reports`.

### `GET /reports/cashier-earnings`

Per-cashier totals. Filters `from_date`/`to_date` (optional, `Y-m-d`).
Sorts `total_earnings`, `cashier_name`; default `-total_earnings`.
**`per_page` defaults to 5**, not the app default. Paginated with the
usual `{earnings_per_cashier: [...], pagination: {...}}` envelope.

Row: `{ id, full_name, total_earnings }`.

Sums only `completed` transactions, windowed on **`completed_at`**.

### `GET /reports/monthly-earnings`

Takes `year` (optional, integer, min 2026, max next year; defaults to the
current year). No filters, no sorts, **no pagination**.

`data` is **the array itself** — not wrapped in a named key — and always
holds exactly 12 entries, zero-filled for months with no earnings:

```json
[{ "month": "2026-01", "total_earnings": 0 }, ...]
```

Sums only `completed` transactions, but windowed on **`created_at`** —
inconsistent with `cashier-earnings`, which uses `completed_at`. The two
endpoints can therefore disagree about which month a transaction belongs
to when it was initiated near a month boundary.

Note the range is `>= startOfYear` and `< endOfYear`, so the final
instants of 31 December fall outside it.

## Known backend gaps (asked for, not yet landed)

- **`servicesSold` still has no `defaultSort`.** `allowedSorts`
  (`total_quantity`, `subtotal`, `service_name`) landed in `2a67f91`, but
  the default did not, and it is a `groupBy` aggregate — so with no sort
  applied, page order is undefined and pagination can repeat or skip rows.
- **App timezone is still `UTC`**, so every "today"/"month" boundary is a
  UTC one. In UTC+8 that is 08:00 Manila to 08:00.
- **Password validation is still `['required', 'string']`** — no minimum
  length, no complexity. The Manage Accounts create form imposes 8
  characters client-side, which does nothing for anything calling the
  API directly.
- **No `search` filter** on `/activity-logs`, `/reports/*`, `/users` or
  `/cashiers`. Activity logs remain date-only with `created_at` as the
  sole sort.
- **`/reports/transactions` computes `total_earnings` from the same
  builder instance `paginate()` was called on**, so the offset may leak
  into the aggregate and zero the total on page 2 onward. Unverified.

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
| `voided_at` | column | present only when non-null |
| `voided_by` | relation | `{id, full_name}`; **omitted unless eager-loaded** |

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
`username`), `is_active`, `role`. No `email` — dropped in `4955f19`.

`whenNotNull` was removed from every field in the same commit, so they are
sent as-is rather than omitted when null. `role` is the one exception: it
is `whenLoaded('roles')`, so it is present only where the caller eager-
loaded the relation. Every endpoint does today; see the note above for
how narrowly.

## Authorization

| Endpoint | Rule |
|---|---|
| `GET /transactions` | admin or cashier; cashiers see only their own rows |
| `GET /transactions/{id}` | admin, **or** the owning cashier — else 403 |
| `POST /transactions` | cashier only (admins cannot create) |
| save / cancel | owning cashier only |
| void | admin only |
| series receipts, activity logs, reports | admin only |
| `GET /users`, `GET /cashiers` | admin only, as of `4955f19` |

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
GET    /users                                              (admin)
POST   /users            GET  /users/{id}
DELETE /users/{user}                                       (admin)
PATCH  /users/{user}/toggle-status                         (admin)
GET    /cashiers                                           (admin)
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
GET    /reports/cashier-earnings                           (admin)
GET    /reports/monthly-earnings                           (admin)
```

There is no student or payer model — `customer_name` is a free-text string
on the transaction, consistent with ADR 0001.

`PUT/PATCH` and `DELETE` exist for suppliers, item codes and services via
`apiResource`, but there is no update or delete endpoint for a transaction
itself — only the save/cancel/void state transitions.
