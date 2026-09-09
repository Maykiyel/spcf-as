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

### Comments

**One line where possible, three at the outside.** A comment earns its place
only by saying something the code cannot: a wire fact (`an unknown filter key
is a 400, not ignored`), a trap that will bite again, or why the obvious
approach was not taken. Everything else is noise the reader has to skip.

Do not restate what the code does, and do not argue a case in a comment. The
long version of a decision belongs in the commit message, the PR, an ADR, or
`BACKEND_NOTES.md`; the comment carries the fact and points there. Writing it
in both places is how a 15 line module becomes 80.

Test files follow the same rule, with one carve-out: keep the single line
that says why a non-obvious assertion exists, because that is what stops the
next reader deleting a guard they mistake for ceremony.

## Language

**Auth session module**:
The single interface (`login`, `restore`, `logout`, `end`) that owns all writes to the auth store. UI, route guards, and the HTTP client call it; nothing else calls the store's setters directly. `end` is the session ending without the user asking — the server stopped accepting them mid-session, on a 401 or because their account was deactivated. It is not `logout`, and `logout` cannot stand in for it, because that method's own `POST /logout` is one of the requests being refused.
_Avoid_: auth store (that's the state container it manages, not the module itself), auth context

**Dashboard (page)**:
The page at `/dashboard` that everyone lands on after signing in. Everyone sees today's transaction count and today's earnings, scoped to them by the endpoint. An admin additionally sees a monthly earnings bar chart for a chosen year and a table of earnings per cashier. **The role branch is forced by the API, not chosen for design reasons**: `GET /dashboard` scopes itself and serves both roles, but `/reports/*` is admin-only and answers a cashier with a 403, so a cashier's dashboard must not request those at all. That is why each admin-only section is a component holding its own query — unmounted, it never fires — rather than one page-level fetch with the results hidden. The same structure gives each section its own loading and error state, so one failing request does not blank the other two.
_Avoid_: home, landing page (the login screen is what people mean by those); "the reports page" (Reports is a nav group of its own, and its leaves are separate pages)

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
A dedicated location for API calls genuinely needed by more than one feature, sitting outside `src/features/*` — per the project's reference architecture (bulletproof-react), which explicitly allows this as an alternative to duplicating a call across features. Distinct from `components/ui`: this tier is allowed to know about domain concepts, whereas `components/ui` must stay domain-agnostic. It holds `item-codes.ts` (the shared `ItemCode` type and `searchItemCodes`), `services.ts` (the `Service` shape alone — both features fetch it differently), `cashiers.ts` (the `Cashier` type and `getCashiers`, promoted out of Series Receipts when the Transactions list's cashier filter became a second consumer), and `transactions.ts` (`TransactionScalars` alone, the wire fields the Transactions list row and the Transactions Report row share). Only promote something here once a second real feature actually needs it — don't pre-build shared modules for hypothetical future consumers (e.g. the item-code combobox UI itself stayed feature-local to Services for exactly this reason; only the type + fetcher moved here). Promote as much as is genuinely shared and no more: `services.ts` is a type with no fetcher for exactly that reason, and stayed one when the Service Breakdown became a third consumer needing a fetch of its own (`getService`, by id, for that page's heading) that neither of the other two wants.
_Avoid_: treating this as a place for anything reusable in general — it's specifically for cross-feature API calls, not a catch-all

**`src/components/filters/` (shared filter controls)**:
The tier for a filter control that more than one feature's table needs and
that knows a domain concept, which is what keeps it out of `components/ui`
(domain-agnostic by rule) and out of `src/api/` (API calls, not React). It
holds `cashier-filter.tsx`, promoted out of the Transactions list when the
Transactions Report became a second page needing the same picker. A control
here owns its own query, so "not rendered" means "never requested", which is
what an admin-only endpoint requires of a control a cashier must never fire.
Same promotion rule as the tiers above: move something here once a second
feature actually needs it, and no sooner.
_Avoid_: a home for every filter control (a filter used by one feature stays
in that feature); confusing it with `components/ui/table-filter`, which holds
the domain-agnostic input primitives these are built from

**`src/utils/` (shared helpers)**:
The same idea as `src/api/`, one tier over: pure functions with no API call and no React in them, needed by more than one feature. It holds `currency.ts` (`formatCurrency`, `roundToCents`), which lived in `features/transactions/lib/` until the Dashboard needed to format money too — a feature importing from another feature is the thing this tier exists to avoid. Same promotion rule as `src/api/`: move something here when a second feature actually needs it, not before.
_Avoid_: a dumping ground for anything that isn't a component — a helper used by one feature stays in that feature's `lib/`

**Transaction draft**:
The in-progress transaction a cashier assembles on the New Transaction page — line items, payer name, amount paid — before Confirm saves it. Distinct from the confirmed `TransactionDTO` the View Transaction and Print pages load.
_Avoid_: receipt, cart, basket — in code. On screen the builder panel deliberately still reads "Receipt", which is the cashiers’ word from the legacy system; this rule governs identifiers and types, not the UI copy.

**Acknowledgement Receipt**:
The printed artifact produced for one completed Transaction, given to the payer. Distinct from **Series receipt** (below) — an Acknowledgement Receipt is the document a payer walks away with; a Series receipt is the pre-numbered block of physical sheets its number is drawn from.
_Avoid_: bare "receipt" in code (ambiguous with Series receipt — always qualify). User-facing copy may still say "Receipt" where that is what cashiers call it.

**Series receipt**:
A pre-numbered block of receipt sheets (`from`–`to`) assigned to one cashier for physical/manual receipt writing, tracked so numbering never collides across cashiers. Create-only from the frontend — no edit or delete. `from` is server-computed (next available number) and race-checked on submit; the frontend must treat it as derived, not user-entered. Its "Remaining Sheets" value is currently just the total sheet count at creation — not yet a live decrementing figure; it will start behaving as genuinely "remaining" once Transactions exists and consumes sheets. No restriction today on a cashier holding more than one series receipt.
_Avoid_: receipt book (fine in conversation, but code/UI should say "series" or "series receipt")

**Cashier** (in the context of a Series receipt):
The user a series receipt is assigned to. The backend's `SeriesReceipt` model and API call this relation/field **`account`** (`account_id`, `account: {id, full_name}`) — but it always means the assigned cashier, validated server-side to have the `cashier` role. Frontend code for this feature should name things `cashier`, not `account`, to avoid collision with unrelated "account" concepts — translate at the API-call boundary if needed. A request has gone to the backend team to rename the field to `cashier_id`/`cashier`; if that lands, drop the one-off `key: "account"` exception on the Series Receipts table's sort column and rename it to `cashier` throughout.
_Avoid_: account (only acceptable when directly mirroring the raw API field name, e.g. `account_id` in a request payload type)

**Why the table's `key: "account"` isn't translated to `cashier` today (deliberate, not an oversight):**
When you *create* a series receipt, translating `cashierId` → `account_id` is easy — it's just one field in one function, nobody else ever touches it. But the Series Receipts *table* is different, because that same column does two jobs: it decides which field to read off the row, AND it decides what word gets sent to the backend when someone clicks the column to sort it. So as long as the backend calls this field `account`, the sort click has to send the word `account` — which means the column's internal name has to stay `account` too, even though everything the cashier actually *sees* on screen already says "Cashier" (the header has always been free). If someone renames this to `cashier` everywhere without knowing this, clicking the "Cashier" column to sort it will silently break (or error) in production, because the backend has no idea what a `cashier` sort is — it only understands `account`.

**Those two jobs are no longer stuck together.** `ColumnDef` gained an optional `sortKey` for the Transactions list, where `/transactions` names two columns' sorts (`created_at`, `customer`) differently from the fields it returns them in (`date`, `customer_name`) — one column in one table wasn't worth a separation, four columns across four pages is. So this exception is now resolvable without waiting on the backend: rename the field to `cashier` at the fetcher, the way `getUserAccounts` renames `user_name`, and set `sortKey: "account"` on the column. It stays as-is here because doing it is a change to Series Receipts, not to the Transactions work that made it possible, and the backend rename would make even the `sortKey` unnecessary. Whichever lands first, the other becomes a one-line deletion.

**Accounts (sidebar nav group)**:
The top-level, admin-only navigation group for user-account-related pages. Holds Manage Accounts and Series Receipts. Distinct from, and not to be confused with, the `account` field on `SeriesReceipt` (see Cashier, above) — the nav group is about managing user accounts in general, the field is about which cashier one receipt series belongs to.
_Avoid_: conflating this group's "account" with the `account_id`/`account` field on Series Receipt

**Manage Accounts (page)**:
The admin-only user directory at `/accounts/manage` — lists every admin and cashier, creates an account, activates and deactivates one, and occasionally deletes one. Deactivating is the real way to revoke access: it always works, it is reversible, and it suspends that cashier's active series receipt. Deleting is the lesser action, refused for anyone holding any history. Named for what it does, and the one thing it cannot do is edit — there is no update endpoint, so nothing here renames a user or changes a role, and the UI must not imply otherwise. Role is chosen at creation and fixed thereafter. There is no email anywhere on it: the column was dropped from the `users` table. It is a server-backed table like every other one, since backend `4955f19` paginated `/users` — it narrows by Role and Status, and it has no search box, because `/users` accepts no `filter[search]` and an unknown filter key is a 400 here rather than an ignored parameter.
_Avoid_: user management (promises editing that doesn't exist), Accounts (that's the nav group this page sits in)

**View Transactions (Per Receipt) (page)**:
The page at `/transactions/receipts`, and the app's only route to *finding* a transaction. A server-paginated, server-sorted, server-filtered table over `GET /transactions`; a row opens the existing View Transaction page for that control ID. Shared by both roles, with the endpoint doing the scoping: an admin sees every transaction, a cashier sees only their own, and nothing in the frontend re-implements that rule. **It has no search box** — `/transactions` accepts no `filter[search]`, and an unknown filter key is a 400 here rather than an ignored parameter. The page leads with a filter panel instead, and the table's own toolbar carries the page-size control and nothing else. The panel is one component (`TransactionListFilters`) whatever it holds, which is what lets the Void page reuse the finding half of this page rather than re-listing its controls: payer name, series number, item name, status and date range, plus cashier for an admin; the cashier filter is gated by being *declared* only for an admin, not merely by its control being hidden, because a declared filter is what the URL can restore. Rows show item names as a summary and no per-item money: the list endpoint returns items stripped to an id and a name, and per-item money is what the detail page is for.
_Avoid_: transactions list (ambiguous with the Itemized List page, and with the Void page — the same table with status pinned and a Void action per row); receipts page (a Series receipt is a different thing entirely — see above)

**Void (page)**:
The admin-only page at `/void`, and the only way to reverse a completed payment record from this application. It is the View Transactions table with the status pinned to `completed` and a Void action on each row, built after that page so it reuses its columns, filter panel and row rendering rather than restating them; the three things that differ are named at `transactionListColumns` and on `TransactionListFilters`. **The pin is not a filter default.** `status` is not among the filters this page declares, and `getVoidableTransactions` applies `completed` after the URL has had its say — a declared filter with a `completed` default would leave `?void_status=pending` a working way to fill the page with rows whose only action is a guaranteed 409. Voiding asks for confirmation naming the control ID, series number, payer and total, because there is no un-void endpoint and the action takes no reason or remarks, so that dialog is the only checkpoint that exists. A success invalidates the shared `transactions` cache prefix, which reaches both lists **and** the transaction's own detail entry — the last one deliberately, since that query is stale-tolerant for about a minute and would otherwise show a just-voided transaction as still completed.
_Avoid_: cancel (a different action on a different status — cancelling is the owning cashier's, on a `pending` transaction, and voiding is an admin's, on a `completed` one); delete, refund, reverse

**Voided (status)**:
What the UI calls a transaction whose status is `returned` on the wire. The backend enum says `returned`; every label a user reads says "Voided", including the status filter's option and the badge, because voiding is the action that produces it and the word an admin will look for. The wire's spelling stays in types, filter values and query params; the translation happens once, in `TRANSACTION_STATUS_LABEL`.
_Avoid_: returned (in user-facing copy — correct in code, where it is the API's own value)

**Reports (sidebar nav group)**:
The top-level, admin-only navigation group over `/reports/*`. It replaced a
single `/reports` page holding one heading, because the two reports beneath it
answer different questions and have different shapes. Holds the Transactions
Report and the Services Sold Report. Admin-only throughout: every `/reports/*`
endpoint answers a cashier with a 403. The Service Breakdown sits under the
same prefix and inherits the same rule, but is not a member of this group: a
parameterised path is not a link a sidebar can render, so it is a route in
`create-router.tsx` that spells its own `roles` rather than a `pages.ts` leaf
that inherits them.
_Avoid_: analytics, statistics; "the reports page" (there is no page at
`/reports` itself, only leaves under it)

**Transactions Report (page)**:
The admin-only page at `/reports/transactions`: a server-paginated table of
completed transactions for a chosen period, with the period's total earnings
beneath it. Named for what it is. It was specified as "Consolidated Item
Reports", which was wrong twice over, since it carries no item data at all and
"item" means the category in this glossary.

**The total is the server's, never a sum of the visible rows.** The endpoint
computes it across the whole filtered set, so a client-side sum would answer a
different question and disagree with itself page by page. A failure shows
"Unavailable" rather than a formatted zero, because a report that reads zero
when it actually broke is the one failure an accounting figure must not have.

**Its filter surface is a date range and a cashier, and nothing else.** No
search box, since the endpoint allow-lists no `filter[search]` and an unknown
key is a 400; no status filter, because only completed transactions are in
scope and the endpoint enforces it. The cashier picker offers real cashiers
alone, as the endpoint validates the identifier against the cashier role.

Its sort allow-list is not the Transactions list's: it names the payer sort
`customer_name` rather than `customer`, allows `cashier_name` where the list
does not, and allows no `series_number` sort at all.

Windows on the transaction's creation time, while the Dashboard's cashier
earnings window on completion time. Two figures over "the same" month can
therefore disagree for a transaction that straddled a boundary. Neither is
wrong; they answer slightly different questions.
_Avoid_: Consolidated Item Reports (the old name, wrong on both words), earnings
report (that is the Dashboard's charted figure), item report

**Services Sold Report (page)**:
The admin-only page at `/reports/services-sold`: one row per service for a
chosen period, with the quantity sold and the revenue. It aggregates **per
service**, which is why it is named for services. It was specified as the
"Individual Item Report", which was wrong on the glossary, since an **Item
code** here is a category and a **Service** is the priced, sellable thing.

**Its period defaults to the current month, and that is load-bearing.** Every
row links to a Service Breakdown, whose endpoint requires both dates, so an
unfiltered summary would render rows the API rejects before the click became
a UI problem. Clearing the range therefore returns to the current month
rather than to an unfiltered view.

**It always sends a sort, and always includes `service_name`.** The endpoint
is a grouped aggregate with no `defaultSort`, so an unsorted request
paginates unstably. `service_name` is the only allow-listed key that is
unique, so it is the only one that orders the rows completely; revenue and
quantity both tie freely and several services sit at zero in any period.
`getServicesSold` appends it rather than the page merely declaring it, so it
still holds under a revenue sort and under the unsorted state the header can
reach. Alphabetical is also the better default to arrive on, there being no
search box to find a service with.

**Declaring it alone was not enough, and that surfaced a table-tier bug.**
A declared sort used to sit at priority 1 while a clicked column joined
behind it, so a unique declared key made every other header inert: clicking
Revenue reordered nothing. `sortsToExtend` now has the first click supersede
a declared default instead. The Transactions Report had the same defect for
the same reason, its `id` tiebreaker being unique, and is fixed by the same
change.

Its filter surface is a date range and nothing else; neither endpoint here
allow-lists a search or any other filter.
_Avoid_: Individual Item Report (the old name, wrong on the glossary), item
report, sales report

**Service Breakdown (page)**:
The admin-only page at `/reports/services-sold/:serviceId`: every completed
transaction in a period that included one service. Reached by clicking a
service on the Services Sold Report, which carries its period across so the
detail matches the figure it explains.

**A route rather than a drawer or an expanding row.** It is a paginated table
with its own sorting, which would fight the parent table's state inside it,
and being a route makes one service for one period a shareable link. It is
the only page in the app whose date range is mandatory rather than optional,
which is what `dateRangeFiltersRequired` exists for.

Its rows carry no items and no service. The heading's service name comes from
a separate `GET /services/{id}`, because the route carries only an id and the
breakdown envelope names no service at all; that request failing leaves the
plain heading rather than blanking a table that loaded.

Its sort allow-list is a third distinct one, neither the Transactions list's
nor the Transactions Report's: it allows `series_number`, which the report
does not, and neither of the two amount sorts, which the report does.
_Avoid_: item breakdown, service detail (that is a Services catalog record),
drill-down (fine in conversation, not as the page's name)

**Activity entry**:
One recorded event in the system's audit trail — a transaction initiated, an item removed, a series receipt exhausted, an account created. Seventeen kinds, written by the backend and never by this application. Its parts each have a fixed name: the **actor** who did it, the **subject** it acted on, its **type**, its **context**, and its **details**. It is the only place the admin who voided a transaction is recorded; the transaction itself does not carry them in any list.
_Avoid_: log line, audit record, history item

**Actor** (on an activity entry):
Who performed an entry's action. Always renderable: an action no person performed arrives named "System" with a null id, so nothing here invents copy for an absent user. Distinct from **Cashier**, which is a role a person holds, and from the `account` field on a Series receipt.
_Avoid_: user, author, performer

**Subject** (on an activity entry):
The record an entry acted on, as a type, an identifier, and whether it still exists. Named and shown whatever its state: it becomes a link only when the record exists *and* its type has a page in this app, which today means transactions alone. A deleted subject says so rather than becoming a dead link.
_Avoid_: target, resource, related record

**Context** (on an activity entry):
The readable past-tense sentence describing what happened, generated by the backend when the entry was written and rendered verbatim. Unrelated to this file. The name is the wire's, and it is kept rather than translated because renaming the one field a reader will grep for costs more than the collision does.
_Avoid_: description (what issue #63 calls it, and not what the API sends), message, summary

**Details** (on an activity entry):
An entry's field-by-field specifics, as a flat list of label/value pairs. Values arrive fully formatted, currency symbols and before/after arrows included, so they are printed as they are. The shape is guaranteed for every action by the backend's formatter interface, which is what lets all seventeen types render through one component with no branching.
_Avoid_: metadata (the backend's raw column, which this is derived from and which never reaches the client), payload, changes

**Activity Log (page)**:
The admin-only page at `/activity-log`: a server-paginated table of activity entries, newest first, with a drawer for one entry's detail. It is the app's only window onto the audit trail. **Its filter surface is a date range and nothing else** — the endpoint allow-lists no others and an unknown filter key is a 400 — so there is no search box, no filter by event type and none by actor. The type filter is the one worth asking the backend for. `created_at` is likewise the only allow-listed sort, so it is the only column that may be marked sortable.
_Avoid_: audit log, history, system log (all fine in conversation; the page, the route and the sidebar entry all say "Activity Log")

**Detail drawer**:
The right-hand panel this app opens over a list to show one row's detail without leaving the list. Introduced by the Activity Log and so far its only use. Distinct from a modal, which interrupts; a drawer is for inspecting several rows in turn, which is why closing one returns to the list in place. It opens on what the row already carried and skeletons only the region genuinely still loading.
_Avoid_: sidebar (that's the nav), panel, modal, dialog
