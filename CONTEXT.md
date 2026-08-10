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

**`src/api/` (shared API tier)**:
A dedicated location for API calls genuinely needed by more than one feature, sitting outside `src/features/*` — per the project's reference architecture (bulletproof-react), which explicitly allows this as an alternative to duplicating a call across features. Distinct from `components/ui`: this tier is allowed to know about domain concepts (it currently holds `item-codes.ts`, exporting the shared `ItemCode` type and `searchItemCodes`), whereas `components/ui` must stay domain-agnostic. Only promote something here once a second real feature actually needs it — don't pre-build shared modules for hypothetical future consumers (e.g. the item-code combobox UI itself stayed feature-local to Services for exactly this reason; only the type + fetcher moved here).
_Avoid_: treating this as a place for anything reusable in general — it's specifically for cross-feature API calls, not a catch-all

**Series receipt**:
A pre-numbered block of receipt sheets (`from`–`to`) assigned to one cashier for physical/manual receipt writing, tracked so numbering never collides across cashiers. Create-only from the frontend — no edit or delete. `from` is server-computed (next available number) and race-checked on submit; the frontend must treat it as derived, not user-entered. Its "Remaining Sheets" value is currently just the total sheet count at creation — not yet a live decrementing figure; it will start behaving as genuinely "remaining" once Transactions exists and consumes sheets. No restriction today on a cashier holding more than one series receipt.
_Avoid_: receipt book (fine in conversation, but code/UI should say "series" or "series receipt")

**Cashier** (in the context of a Series receipt):
The user a series receipt is assigned to. The backend's `SeriesReceipt` model and API call this relation/field **`account`** (`account_id`, `account: {id, full_name}`) — but it always means the assigned cashier, validated server-side to have the `cashier` role. Frontend code for this feature should name things `cashier`, not `account`, to avoid collision with unrelated "account" concepts — translate at the API-call boundary if needed. A request has gone to the backend team to rename the field to `cashier_id`/`cashier`; if that lands, drop the one-off `key: "account"` exception on the Series Receipts table's sort column and rename it to `cashier` throughout.
_Avoid_: account (only acceptable when directly mirroring the raw API field name, e.g. `account_id` in a request payload type)

**Why the table's `key: "account"` isn't translated to `cashier` today (deliberate, not an oversight):**
When you *create* a series receipt, translating `cashierId` → `account_id` is easy — it's just one field in one function, nobody else ever touches it. But the Series Receipts *table* is different, because that same column does two jobs: it decides what to show on screen, AND it decides what word gets sent to the backend when someone clicks the column to sort it. Those two jobs are stuck together in this table component by design — there's no separate "how it looks" vs. "what the server hears" setting for a single column, on purpose, because building that separation just for one column in one table isn't worth the extra complexity. So as long as the backend calls this field `account`, the sort click has to send the word `account` — which means the column's internal name has to stay `account` too, even though everything the cashier actually *sees* on screen already says "Cashier". If someone renames this to `cashier` everywhere without knowing this, clicking the "Cashier" column to sort it will silently break (or error) in production, because the backend has no idea what a `cashier` sort is — it only understands `account`. This isn't a bug to fix — it's a trade-off being made on purpose until the backend renames the field, at which point the fix is a one-line swap (see above).

**Accounts (sidebar nav group)**:
The top-level, admin-only navigation group for user-account-related pages. Currently holds only Series Receipts; a future account-management page (creating/editing admin & cashier user records) is anticipated as a sibling but not yet scoped or built — no placeholder route exists for it. Distinct from, and not to be confused with, the `account` field on `SeriesReceipt` (see Cashier, above) — the nav group is about managing user accounts in general, the field is about which cashier one receipt series belongs to.
_Avoid_: conflating this group's "account" with the `account_id`/`account` field on Series Receipt