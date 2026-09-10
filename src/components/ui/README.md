# Shared UI Components

This folder (`src/components/ui/`) holds generic, domain-agnostic components used
across the entire app — tables, cards, buttons. Anything in here **must not**
import from `src/features/*` or `src/app/*`. Dependencies flow one direction:

```
components/ui  →  features/*  →  app/routes
```

If a component needs to know about "suppliers" or "invoices," it doesn't belong
here — it belongs in that feature's own `components/` folder.

## Button

Three named variants, each a thin wrapper over Mantine's `Button` pinned to one
of our theme colors. We use explicit named components (`patterns-explicit-variants`)
instead of a single `<Button variant="...">` prop, so usage is self-documenting.

| Component       | Theme color | Typical use                         |
| --------------- | ----------- | ----------------------------------- |
| `PrimaryButton` | `primary`   | Save, Submit, primary actions       |
| `DangerButton`  | `danger`    | Cancel, Delete, destructive actions |
| `EditButton`    | `tertiary`  | Row-level "Edit" actions in tables  |

```tsx
import { PrimaryButton, DangerButton, EditButton } from '@/components/ui/button';

<PrimaryButton onClick={handleSave}>Save</PrimaryButton>
<DangerButton onClick={handleCancel}>Cancel</DangerButton>
<EditButton onClick={() => navigate(`/suppliers/${id}`)} />  {/* defaults to "Edit" label + icon */}
```

All three accept every prop Mantine's `Button` accepts (`loading`, `fullWidth`,
`size`, `disabled`, etc.) — they only pin `color`, nothing else.

**Adding a fourth variant?** Only do it if it maps to a real theme color used
consistently across the app for one purpose (like `success` for a future
"Approve" button). Don't add a variant for a one-off color — use the base
Mantine `Button` with an explicit `color` prop for one-off cases instead.

---

## Card

A generic surface/container used for the `DataTable` wrapper _and_ dashboard
widgets. Compound component with four independent pieces — use only what a
given surface needs.

```tsx
import { Card } from "@/components/ui/card";

<Card.Root>
  <Card.Header
    title="Recent Transactions"
    actions={<PrimaryButton size="xs">View All</PrimaryButton>}
  />
  <Card.Divider />
  <Card.Body>
    <TransactionsList />
  </Card.Body>
</Card.Root>;
```

| Piece          | Purpose                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Card.Root`    | `Paper` wrapper — radius, shadow, border. Accepts any Mantine `PaperProps`.                                                            |
| `Card.Header`  | Title + optional `actions` slot (any `ReactNode` — a button, a group of buttons, a dropdown). Omit entirely for a titleless card.      |
| `Card.Divider` | Optional. Omit for a card with no visual separation between header and body.                                                           |
| `Card.Body`    | `Stack`-based content area. `gap` prop defaults to `"md"`, override for tighter layouts (e.g. `gap="xs"` for a stacked-button widget). |

**Why this exists separately from `DataTable`:** `DataTable.Root` originally had
this exact markup hardcoded. Once we needed the same card chrome for dashboard
widgets, we extracted it — `DataTable.Root` now composes `Card` internally
instead of duplicating it. If the card's visual style ever needs to change
(padding, radius, header background), it changes once, here, and every
consumer — tables and widgets alike — picks it up automatically.

---

## DataTable

A compound component for tabular data: card wrapper, toolbar (composed from
an entries-per-page control, a search input, and whatever filters the feature
supplies), the table itself, and pagination. State (search query, sort, page) is
shared via context — no prop drilling between pieces. It also owns its own
loading, error, and empty states, so consumers don't hand-roll any of that per
table (see [Loading, error, and empty states](#loading-error-and-empty-states)
below).

```tsx
import {
  DataTable,
  useServerTableState,
  type ColumnDef,
} from "@/components/ui/data-table";

const columns: ColumnDef<Supplier>[] = [
  { field: "id", header: "ID" },
  { field: "supplierName", header: "Supplier Name" },
  { field: "contactNo", header: "Contact No" },
  { field: "emailAddress", header: "Email Address" },
  {
    id: "actions", // no field: this column renders a control, not a value
    header: "Actions",
    render: (row) => <SupplierActionsCell supplier={row} />,
  },
];

function SupplierTable() {
  const tableState = useServerTableState({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
    columns,
    sortPlan: SUPPLIERS_SORT_PLAN, // which columns sort is decided here
  });

  return (
    <DataTable.Root title="List of Supplier" state={tableState}>
      <DataTable.Toolbar>
        <DataTable.PageSize />
        <DataTable.Search />
      </DataTable.Toolbar>
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
```

### Pieces

| Piece                  | Purpose                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `DataTable.Root`       | Provides context, wraps children in `Card`. Takes `title` and `state`.                                   |
| `DataTable.Toolbar`    | A row of controls, composed from the pieces below. Omit entirely for a table with no controls at all.    |
| `DataTable.PageSize`   | The "Show N entries" select. Omit for a table that doesn't let the user change the page size.            |
| `DataTable.Search`     | The search input. Right-aligns itself. **On a server-backed table, only compose this on an endpoint that accepts a search filter** — see below. Always safe on a client-side one. |
| `DataTable.Grid`       | The actual `<table>` — headers (with a sort toggle where the endpoint's plan allows one), rows, loading/error/empty states. Takes an optional `onRowClick`; see [Rows that navigate](#rows-that-navigate). |
| `DataTable.Pagination` | "Showing X to Y of Z entries" + page control. Omit for a table that shows all rows with no paging.       |

### Composing the toolbar

`DataTable.Toolbar` requires children. There is no default set of pieces, and
a childless toolbar renders nothing.

That is deliberate, and it is about search. Only three endpoints in this API
accept a `filter[search]` parameter — item codes, services and series
receipts. Everywhere else an unknown filter key comes back as a 400 rather
than being ignored, so a toolbar that rendered a search input by default would
put a control on the page that fails the first moment a user types into it.
Requiring the pieces to be named makes that a compile error instead.

Filter controls are children too — a feature drops its own control in
alongside the shared pieces, with no slot prop involved:

```tsx
<DataTable.Toolbar>
  <DataTable.PageSize />
  <Divider orientation="vertical" visibleFrom="xs" />
  <ServiceStatusFilter
    value={tableState.filters.is_active}
    onChange={(is_active) => tableState.setFilters({ is_active })}
  />
  <DataTable.Search />
</DataTable.Toolbar>
```

**Don't add a boolean prop to vary this.** "Omit the piece you don't need" is
how this component already varies; a `showSearch` flag would be a second,
contradictory way to say the same thing, and the variation after that would
want a third.

**Every table here is server-backed.** There was a `useClientTableState`
for tables holding their rows in the browser, where `DataTable.Search`
could always be shown because searching the loaded array *is* searching the
whole dataset. Manage Accounts was its last consumer, and backend `4955f19`
paginated `/users` underneath it. The hook was deleted once it had none:
a whole parallel filter-sort-paginate implementation kept for nobody, and
the only thing that still needed a column's field for search. Bring it back
from git if a genuinely client-side table ever appears.

The matching half of the rule lives on the list adapter: `createListAdapter`
sends `filter[search]` only for endpoints that opt in with
`{ supportsSearch: true }`. Composing `DataTable.Search` on a table whose
adapter hasn't opted in gives you a box that does nothing, so the two go
together.

### The list adapter's seams

`createListAdapter<TWire, TRow, TMeta>` takes four options, and `TRow`
defaults to `TWire` so a call site that renames nothing declares one type:

| Option | Purpose |
| --- | --- |
| `supportsSearch` | Whether the endpoint accepts `filter[search]`, as above. |
| `selectMeta` | Reads a value sitting beside the rows in the envelope, such as the transactions report's server-computed `total_earnings`. |
| `selectRow` | Renames a wire row to the shape the table reads. A column's sort key has to be a word the endpoint allow-lists, so a field the wire and the UI name differently is renamed here rather than at the column. `/users` (`user_name` to `username`), `/reports/cashier-earnings` (`full_name` to `cashier_name`) and `/series-receipts` (`account` to `cashier`) each use it. All three previously hand-wrote the mapping and rebuilt the envelope around it, which dropped `meta` on the way. |
| `pinnedFilters` | Filters applied past the point the URL reaches, for a list whose scope is the page's own rather than the user's. `getVoidableTransactions` pins `status: "completed"`, because `status` as a declared filter defaulting to `completed` would leave `?void_status=pending` a working way to fill the page with rows that can only 409. |

**A key may be pinned or declared, not both.** The adapter throws on the
first request if it is. A declared key reaches the URL and the pinned one
overrides it, so the control would render and do nothing, which is the same
failure an undeclared filter key already throws for.

### Filtering a server-backed table

Declare the table's filters once, with the values that mean "unfiltered":

```tsx
const tableState = useServerTableState({
  queryKey: ["transactions"],
  queryFn: getTransactions,
  columns,
  urlKey: URL_KEY,
  initialFilters: { status: null, from_date: null, to_date: null },
});
```

`tableState.filters` holds the current values and `tableState.setFilters`
merges a patch into them. Everything else follows from the declaration:

- **The values are part of the query cache key.** This is the whole reason
  the hook owns them. The mechanism this replaced, `createListAdapter`'s
  `extra` argument, handed the fetcher values it never put in the key, so
  every consumer had to remember to add them to its own `queryKey` by hand.
  Services was the only one that ever did, and it remembered; #84 moved it
  onto this and `extra` was deleted in #101 having had no consumers since.
  Forgetting the key serves the previous filter's cached rows with no error
  at all — the worst available failure.
- **Changing a filter resets to page 1**, for the same reason changing
  search or sort does.
- **They reach the wire as `filter[<key>]`**, which is what every filterable
  endpoint here calls them, so a feature's `getX` needs no mapping of its
  own. A `null` value is dropped from the request rather than sent empty —
  an unknown or empty filter key is a 400 here (see `BACKEND_NOTES.md`).
- **Only declared keys move**, in both directions. A key absent from
  `initialFilters` is ignored on read and dropped on write, so a hand-edited
  URL can't inject one and a typo in a `setFilters` patch can't write a param
  nothing will ever read back.

### The date range is one declaration

Some filters only mean something complete. A date range with one end set is
not a filter, and the API answers it with a 422 because `to_date` carries
`after_or_equal:from_date`.

`DateRangeFilter` never emits a half-picked range, so the control can't
produce one. A restored URL still can — which is why a table declares the
range itself rather than assembling it out of parts:

```tsx
useServerTableState({
  ...,
  dateRange: {},
});
```

That one option is what supplies the `from_date`/`to_date` pair, the guard
that keeps half a range off the wire, and `tableState.period` for a link
built out of this table. Declaring the keys without the guard used to be a
thing a page could do, and it compiled.

While the range is unusable the query doesn't run, and the table shows its
empty state rather than an error or a permanent spinner. Omit `dateRange`
and the table always requests, which is right for a table that has none.

**`required` is the stricter guard.**
`GET /reports/services-sold/{service}` validates both ends as `required`
rather than `nullable`, so an *absent* range is a 422 there, not an
unfiltered request. The default guard waves that case through, since neither
end being set is a matched pair. Set `required: true` where the endpoint
demands a range, and also where the page's own rows link somewhere that
does: the Services Sold summary takes optional dates itself, but every row
on it opens a breakdown that will not.

**A table can open on a real range rather than on none.** `default` is
called once per mount, and its value is a default in the full sense —
omitted from the URL and restored on a fresh visit — so a report says
something on arrival:

```tsx
useServerTableState({
  ...,
  dateRange: { required: true, default: currentMonthRange },
});
```

Once per mount is load-bearing, and the hook owns it so a page cannot get it
wrong. Module scope would pin the month to whenever the bundle first loaded
and freeze it under a test clock; recomputing it per render is worse, because
a filter equal to its declared value is the one dropped from the URL, so a
moving default would erase the period a user had just picked.

Note what follows. Clearing the range in the picker writes `null`, which
differs from the default and so deletes the param, which reads back *as* the
default: clearing snaps to the current month rather than to an unfiltered
view. That is right where a range is required and wrong where it is
optional, so give a `default` only to a table that needs one.

**When a cell needs the period, `columns` takes a function.** The range
resolves inside the hook, so a column built before the call can't see it:

```tsx
columns: ({ period }) => servicesSoldColumns(period),
```

That is the Services Sold row link, which carries the period to the
breakdown so the detail matches the figure it explains. An array stays an
array everywhere else.

Key the filters by the API's own filter name (`from_date`, not `dateFrom`)
so that mapping stays a no-op. `TableFilters` values are `string | null` and
nothing else: they round-trip through the URL, which has only strings, so
another type would need a per-filter decoder on the way back in.

**A boolean filter carries `1`/`0` as its value**, not `active`/`inactive`,
and that is a departure from the sentence above. `filter[is_active]` is a
`boolean` rule over a `tinyint`, so `1`/`0` is what the endpoint takes.
Converting in the feature's `getX` instead would leave the URL reading
`accounts_is_active=active` — the wire's key against a value the wire won't
accept — and put back the per-consumer mapping step this mechanism removed.
`UserAccountStatusFilter` and `ServiceStatusFilter` both do it this way,
and both say so at their declaration. A value that genuinely can't survive
the URL as a string is the case `getX` is still for; a boolean isn't one.

Those two, and `UserAccountRoleFilter`, are all built on
`TableFilterSegments` below.

Filter controls are toolbar children, wired by the page:

```tsx
<DataTable.Root title="Transactions" state={tableState}>
  <DataTable.Toolbar>
    <DataTable.PageSize />
    <DateRangeFilter
      value={{
        from: toApiDate(tableState.filters.from_date),
        to: toApiDate(tableState.filters.to_date),
      }}
      onChange={(range) =>
        tableState.setFilters({ from_date: range.from, to_date: range.to })
      }
    />
  </DataTable.Toolbar>
  ...
```

`toApiDate` on the way out rather than a cast: it is idempotent on a
date-only string, so this re-establishes the `ApiDate` type instead of
asserting it.

**Filters are deliberately not on the `DataTable` context**, unlike page and
sort. **Settled by Mike, and not open** — it was raised on #85 and left
unanswered through three batches, so it is recorded here rather than left
to be rediscovered by whoever builds the next table.

The reason is ownership, not prop drilling. `PageSize`, `Search`,
`Pagination` and `Grid` are pieces this tier owns, and the context is this
tier's private channel to its own pieces — they genuinely can't be handed
props by the page. A filter control belongs to a feature: it knows what
`is_active` means and that the wire wants `1`/`0`. Letting feature
components read this tier's context inverts that relationship, and it is
the kind of coupling that is easy to add and hard to take back.

There is a concrete cost too. `TableFilterSegments` is a plain controlled
component, which is why it can be tested standing on its own. On the
context it would either have to be inside a `DataTable` to render at all,
or stay controlled behind a context-reading wrapper — two layers to say
what props already say.

The argument the other way is real but mild: a toolbar mixes two idioms,
shared pieces taking no props beside filter controls taking two, and a
reader has to learn both. The line is that shared pieces are identical on
every page while filters differ on every page.

**Note #59 assumed the opposite.** Its "explicitly rejected: splitting the
table context" paragraph only makes sense if filters were going onto that
context, so the shipped design answered a question that spec thought it had
settled. Naming that here is the point of this note.

### The sort plan

An endpoint's sort surface is one fact: which keys it allow-lists, which of
those are unique, and what it sorts by when asked for nothing. A table
declares it once, beside the fetcher that owns the endpoint:

```tsx
export const TRANSACTION_REPORT_SORT_PLAN: SortPlan = {
  allowed: ["created_at", "id", "customer_name", "total", "amount_paid",
            "change_amount", "cashier_name"],
  unique: ["id"],
  default: [
    { key: "created_at", direction: "desc" },
    { key: "id", direction: "asc" },
  ],
};

useServerTableState({ ..., sortPlan: TRANSACTION_REPORT_SORT_PLAN });
```

That replaced three declarations a table had to keep in agreement: the
`sortKey` on each column, a `*_DEFAULT_SORTS` constant restating the same
wire strings, and an `initialSortsAreTotalOrder` boolean asserting a
property of the data. Two columns files carried a "must stay equal to"
comment in place of an invariant; those are gone.

**`allowed` is the allow-list, and it is per endpoint.** `BACKEND_NOTES.md`
records these, and no two here are alike: `/transactions` names the payer
sort `customer` where both reports name it `customer_name`;
`/reports/transactions` allows the two amount sorts and no `series_number`,
while `/reports/services-sold/{service}` is the exact reverse. A key outside
the list is a 400 or a 422 on the first header click.

**Match the endpoint's own default rather than inventing one**, and match
all of it, including a tiebreaker. Sending any `sort` suppresses the
server's `defaultSort` outright rather than adding to it, so declaring half
of a two-key default silently drops the other half. The `id` half of
`-created_at, id` is what keeps page order defined when two rows share a
`created_at`; without it the same row can appear on two pages and another on
none. Both fit, since a declared second column counts against
`MAX_SORT_COLUMNS` like any other.

**An endpoint with no default of its own is the second case, and the
stronger one.** `/users` declares none, so an unsorted request returns rows
in whatever order the database gives, which is not stable across pages. The
plan names the column's obvious order itself. Inventing a sort is right here
and wrong wherever the endpoint already has one. Leave `default` out
entirely and the table starts unsorted, which is what the three catalog
tables do.

**`unique` replaced the total-order boolean.** A default ending in a unique
key orders the rows completely, so nothing appended behind it can reorder
anything: the click lights a caret and changes nothing on screen, which
reads as broken. Naming which keys are unique lets that be derived rather
than asserted, and the first click on another column then replaces the
default instead of joining it. `sortsToExtend` is where this lives. Order
matters: a unique key that is not last does not make the default a total
order.

**The plan narrows what a URL may carry.** `parseSorts` drops any key
outside `allowed`, for the same reason `declaredOnly` drops an undeclared
filter: a header only ever offers an allow-listed key, so a hand-edited or
stale link is the only way an unknown one arrives, and sending it is a 400.
The 422 recovery below stays as a backstop for an allow-list that has
drifted from the backend.

**Sortability is derived from the plan, not declared per column.** That was
unsafe while `ColumnDef.key` doubled as identity — the Manage Accounts
Actions column was keyed `full_name`, which `/users` allow-lists — and
became safe once `field` and `id` split apart. A column sorts exactly when
its `sortKey ?? field` is in `allowed`, and a rendered column has neither.

**A test names what each table offers**, per endpoint, in
`app/sort-plan-conformance.test.ts`. Derivation makes "a sortable column
names an allow-listed key" true by construction, so the check is now the
explicit set: `sortableColumnIds(plan, columns)` against a written list, and
`unreachableSortKeys(plan, columns)` for keys the endpoint allows and the
table shows no header for. A key wrongly added to `allowed` silently lights
up a header, and this is what still fails when it does. Over static data:
no rendering, no fetcher, no header click. It lives in `app/` because it
spans features.

**A declared sort behaves as a default, not as a starting value.** Like page
1 and an unfiltered filter, it is omitted from the URL and restored on a
fresh visit. An unsorted table has to be representable separately, since an
absent param means "use the declared sort", so that state writes
`<urlKey>_sort=none`. Nothing else uses that word: a real entry is always
`key:dir`. No click produces it; it is what the 422 recovery falls back to,
and what a shared link can carry.

**Clicking a declared column flips it**, ascending to descending and back,
so a declared column is a two-state header. It never cycles off, because off
sends no `sort` at all and the endpoint then answers in its own fallback
order, under headers that all read as unsorted. Any other column's third
click lands on the declared sort for the same reason, rather than on
nothing. `sortsAfterClick` is where this lives.

**A second column joins it rather than replacing it**, up to
`MAX_SORT_COLUMNS`, exactly as it would if the first sort had been clicked
rather than declared. That is right whenever the declared sort ties: the
Dashboard's earnings table declares `-total_earnings`, and a click on
Cashier genuinely breaks the ties among equal earners. A plan naming
`unique` is what turns this off where it would be wrong.

**A note on mocking.** A plan lives in the same module as its fetcher, and a
bare `vi.mock` on that module automocks every export, so the plan becomes
`undefined` and the table silently requests no sort. Use a factory that
spreads `importActual` and replaces only the fetcher, as every page test
here does.

### `ColumnDef<T>`

```typescript
type ColumnDef<T> =
  // a column that reads a field off the row
  | { field: keyof T & string; id?: string; header: string;
      sortKey?: string; render?: (row: T) => ReactNode }
  // a column that renders something no single field holds
  | { id: string; header: string; render: (row: T) => ReactNode;
      sortKey?: string };
```

**Three names, three jobs.** `field` is what the cell reads, `id` is what
identifies the column, `sortKey` is what the wire calls its sort. A single
`key` used to do all three, and the collisions were real: an Actions column
had to borrow an unrelated field because `key` was required, and three of
them carried a comment apologising for it. The union is what makes the
borrowing unnecessary — a rendered column has an `id` and no `field` at all.

**There is no `sortable`.** A column sorts exactly when its `sortKey ??
field` is in the endpoint's [sort plan](#the-sort-plan), which
`useServerTableState` resolves before handing the columns to the grid. That
is why the union matters beyond tidiness: while an Actions column was keyed
`full_name`, and `/users` allow-lists `full_name`, deriving sortability
would have lit a caret over the Actions header. A column with no field and
no `sortKey` can never be sortable, whatever the plan allows.

**Set `sortKey` when the endpoint's name for a column's sort isn't the field
the cell reads.** `/transactions` is the case it exists for: the response
carries `date` and `customer_name`, and the same two columns sort as
`created_at` and `customer`. `field` is constrained to `keyof T`, so without
`sortKey` such a column could be read or sorted but not both, and the only
way out would be renaming the row's own fields to the wire's sort names,
forking `TransactionListRow` off the detail type it deliberately shares a
base with.

**Set `id` on a field column only when two columns read the same field.**
The grid uses `columnId(col)` — `id ?? field` — as its React list key, so
two columns on one field without an `id` cause silent rendering bugs on sort
and page changes.

Note what none of this separates: display naming from field naming. A
column's header has always been free (`header: "Cashier"` over `field:
"cashier"`); `sortKey` frees the sort name, not the field one.

### Rows that navigate

`DataTable.Grid` takes an optional `onRowClick`. A table that omits it
renders exactly as before — no pointer cursor, no handler:

```tsx
<DataTable.Grid onRowClick={(row) => navigate(`/transactions/${row.control_id}`)} />
```

It's a prop on the piece rather than part of the shared state because the
state comes from `useServerTableState`, which knows nothing about
navigation.

**A click that landed on a control inside a row doesn't fire it.** Anchors,
buttons and form controls in a cell are their own action. The case it was
built for is the Void page (#62, not yet built), which puts a Void button
on every row of the same table the receipts list navigates from: without
that rule, voiding would also navigate away from the page the admin is
working through.

**Pair it with a real link in one cell.** `onRowClick` is a mouse
affordance and nothing else: a `<tr>` is not focusable, and a screen reader
in table mode won't announce one as actionable. The receipts list renders
its Control ID cell as a `react-router` `Link`, which is what gives keyboard
users a target, and what makes middle-click and open-in-new-tab work.

### Custom cells

Use `render` for anything beyond a plain field value. If the cell needs a hook
(`useNavigate`, `useMutation`), has non-trivial JSX, or is worth testing in
isolation, extract it into its own component in that feature's folder — don't
inline complex JSX into the `columns` array.

```tsx
// src/features/suppliers/components/supplier-actions-cell.tsx
export function SupplierActionsCell({ supplier }: { supplier: Supplier }) {
  const navigate = useNavigate();
  return <EditButton onClick={() => navigate(`/suppliers/${supplier.id}`)} />;
}
```

This same pattern is how different pages get entirely different Actions
columns (a `VoidActionsCell` with Restore/Delete buttons, for example) without
`DataTable` ever needing to know what "void" or "restore" mean — it just calls
whatever `render` function each feature provides, per row.

### State

`useServerTableState` wraps a `useQuery` call and sends `page`/`search`/`sort`
as API query params instead of filtering in-browser — use it for large,
unbounded datasets (invoices, transactions, audit logs). Search is debounced
400ms before it hits the network, and paging/sorting/searching keeps the
previous page's rows visible while the next request is in flight
(`keepPreviousData`) instead of flashing to empty.

It returns `DataTableContextValue<T>`, and `DataTable.Toolbar` / `.PageSize`
/ `.Search` / `.Grid` / `.Pagination` read only that. This is the
`state-context-interface` pattern: the UI is dependency-injected with state
rather than coupled to one implementation, which is what lets the pieces
compose freely per page.

**Under the hood** it is built on an internal `useTableControls` hook (not
exported — an implementation detail of this folder) that owns
page/pageSize/search/sort state and their handlers. If you ever need a
second variant (a genuinely client-side table, something websocket-synced),
build it on `useTableControls` rather than hand-rolling that state again:
that is what keeps two such hooks behaviourally identical rather than merely
shape-identical.

### URL-persisted state

`useServerTableState` accepts an optional `urlKey` string. When provided,
page/pageSize/search/sort state and the declared filters are synced to the
URL's search params instead of living in local `useState`, so the view survives a
refresh, comes back on a history entry, and is shareable as a link.

```tsx
const tableState = useServerTableState({
  queryKey: ["suppliers"],
  queryFn: getSuppliers,
  columns,
  urlKey: "suppliers", // <-- opt in
});
```

**Fully backward compatible when omitted** — no `urlKey` means the table
behaves exactly as before, with local component state. Nothing about
existing tables changes unless you explicitly add the prop.

**Namespaced per table.** Params are prefixed with `urlKey`, so multiple
tables can live on the same page/URL without clashing —
`suppliers_page`, `suppliers_q`, `suppliers_sort`, `suppliers_dir`,
`suppliers_size`, not generic `page`/`q`/`sort`. A filter joins the same
namespace under its own key — `suppliers_status`, `suppliers_from_date` —
so a filter must not be keyed `page`, `size`, `q` or `sort`. None of the
API's filter names are, so this hasn't come up.

**Only declared filters are read back.** A filter is read out of the URL
only if it appears in `initialFilters`, so a hand-edited or stale link
can't inject a filter key the endpoint would answer with a 400.

**A control change replaces the history entry; it does not push one.**
Filtering, searching, sorting and paging all write with `{ replace: true }`
(`updateParams` in `use-table-controls.ts`), so Back leaves the page rather
than rewinding through the controls you touched. **Settled by Mike, and not
open** — it was raised on #85 and carried unanswered through three batches,
so it is written here rather than left to be rediscovered.

**This supersedes #59's user story 7**, "As an admin, I want the back button
to restore my previous filter state, so that navigation behaves the way the
rest of the web does." That story is unmet on purpose. It was written
before the mechanism existed, and it does not survive contact with the fact
that one function writes every control.

The reasoning is search. Every control goes through one function, so making
a filter click a place you have been makes a *keystroke* one too, and Back
after typing "graduation" would walk back a letter at a time. Nobody wants
that version, and splitting the behaviour per control — push for filters,
replace for typing — buys an undo nobody asked for at the price of two
rules where there is now one.

Sharing is unaffected either way: the URL is still written on every change,
so copying a link, bookmarking, and refreshing all behave the same. Only
the history entry differs.

**Two independent debounces on search.** Typing goes into a local draft
first, debounced 400ms before it's written to the URL. For
`useServerTableState`, the network request has its own separate 400ms
debounce on top of that — they're deliberately decoupled, so URL sync isn't
gated on request timing (or vice versa).

**Defaults are omitted from the URL**, not written explicitly — page 1,
the default page size, the declared sort (an unsorted state, unless
`sortPlan` says otherwise), and any filter sitting at the value it was
declared with all collapse to "no param" rather than `?page=1` or
`?status=all`. Keeps shareable URLs clean instead of noisy, and stops an
unfiltered table from looking filtered. The one marker written rather than
omitted is `sort=none`, which a table with a declared sort needs to say
"unsorted", a state no header click reaches. See [Declaring the default
sort](#declaring-the-default-sort).

**Search, sort and filter changes reset the page param.** Narrowing or
re-sorting with a stale page number would risk showing an empty page, so
all three clear `page` back to its default (omitted) whenever they fire.

**A filter change replaces the history entry rather than pushing one**, the
same as every other control here — `setSearchParams` is called with
`{ replace: true }` throughout. So navigating back from the table returns
you to whatever preceded it, with the table's filters intact on its own
entry; back is not an undo for an individual filter change. If per-change
undo is wanted, that is a change to how all four controls write history,
not a filter-only one.

### Loading, error, and empty states

`DataTable.Grid` derives everything below from `isLoading` / `isError` /
`rows` in context — none of it needs to be wired up per table:

| State                                          | What renders                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| First load, no data yet                        | Skeleton rows (row count capped at 10, shaped to match your columns)         |
| Paging/sorting/searching after data has loaded | Existing rows stay visible, dimmed to 60% opacity, instead of flashing empty |
| Query succeeds with 0 results                  | "No entries found"                                                           |
| Query fails before any data has loaded         | The error message in place of rows                                           |


**A client-side table whose data comes from a query still has both
states** — they just belong to the page, not to the hook. No table does
this today; the example below is the shape, not a pointer to live code.
A table whose rows arrive from a query the page owns has no request of its
own to report on, so the component that called `useQuery` is what knows.
Spread the query's own flags over the state on the way in, and
`DataTable.Grid` renders the skeleton and the error row as usual:

```tsx
const { data, isLoading, isError } = useQuery({ queryKey, queryFn });

<DataTable.Root
  title="User Accounts"
  state={{ ...tableState, isLoading, isError, errorMessage: "..." }}
>
```

Deliberately not passthrough options on the hook: the override is one
line at the call site and reads as exactly what it is.

**`useClientTableState` was deleted.** It had no consumers and was kept
anyway, on three stated grounds: it was half of the swap this folder is
built around, `useTableControls` kept the two behaviourally identical for
free, and the next bounded in-memory list would want it. That note said to
delete it only when those stopped being true, and they did. The server hook
grew a declared-filter surface, a date range descriptor and a sort plan, and
now resolves each column's sortability before the grid sees it; the client
hook had none of that, so the two were no longer interchangeable and
`useTableControls` was no longer keeping them identical for free. It was
also the last thing reading a column's field for search, which is what stood
between `ColumnDef` and splitting `field` from `id`. Take it out of git if a
genuinely client-side table appears; build it on `useTableControls`.

If you need a custom error message instead of the default "Couldn't load
data. Please try again.", that comes from `errorMessage` in
`use-server-table-state.ts` — edit it there if a specific table needs
different wording; it isn't currently a per-table prop.

### Sort error recovery

If a sort reaches the wire and the backend rejects it (a 422 — the sort plan
should prevent it, but an allow-list can drift), `useServerTableState`
detects this automatically: it resets the sort to unsorted and shows a toast
via `@mantine/notifications` ("That column can't be sorted.") instead of
leaving the table stuck showing nothing. Any other error (500, network) is
not special-cased this way — it surfaces as the generic error state above.

**This requires `<Notifications />` to be mounted once somewhere in the app
tree** (typically inside `MantineProvider`). If it isn't mounted, the sort
still resets correctly, but the toast explaining why silently does nothing —
worth confirming this is in place before relying on it.

---

## TableFilterSegments

A segmented control for a table filter that takes one of a few fixed
values. Domain-agnostic: it knows a filter is a string or `null`, and that
a `SegmentedControl` cannot hold `null`, and nothing else.

```tsx
<TableFilterSegments
  label="Status"
  allLabel="All Statuses"
  options={[
    { label: "Active", value: "1" },
    { label: "Inactive", value: "0" },
  ]}
  value={tableState.filters.is_active}
  onChange={(is_active) => tableState.setFilters({ is_active })}
/>
```

**The `null` ↔ "all" bridge is the whole reason this is shared.** A filter's
unset value is `null`, which is what `useServerTableState` drops from the
request rather than sending empty — and a `SegmentedControl` has no null to
show for it. Every re-implementation of that bridge is a chance to send
`"all"` to an endpoint that has no such value, or to render an unfiltered
control as blank. It is handled here once and nowhere else.

`allLabel` is the caller's, not this component's. "All" and "All Statuses"
are both right, depending on how many filters sit side by side in that
toolbar. `label` is required because it names the control for assistive
tech and scopes it in tests: segment labels are routinely the same words as
the values they filter on, so "Active" on its own does not distinguish this
control from a row in the table below it.

**Wrap it in your feature; don't compose it bare.** Both consumers today
are three-line components in `features/*/components/` that name their
filter, its options, and the wire values those options carry:

```tsx
export function ServiceStatusFilter(props: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <TableFilterSegments
      label="Status"
      allLabel="All"
      options={[
        { label: "Active", value: "1" },
        { label: "Inactive", value: "0" },
      ]}
      {...props}
    />
  );
}
```

That split is the rule at the bottom of this file applied to one control:
the piece with no domain knowledge lives here, and the piece that knows
what an `is_active` flag is worth on the wire lives with the feature that
knows. Composing a bare `TableFilterSegments` in a toolbar isn't wrong, but
it puts the wire-value decision in a page's JSX rather than somewhere a
reader looking for it will think to look.

---

## TableFilterText

A free-text control for a table filter the endpoint matches partially —
payer name, item name, series number. Domain-agnostic in the same way
`TableFilterSegments` is, and wrapped per feature for the same reason.

```tsx
export function TransactionPayerFilter(props: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return <TableFilterText label="Payer Name" placeholder="Any payer" {...props} />;
}
```

Two things it owns, both of which a re-implementation gets subtly wrong:

- **The `null` ↔ `""` bridge.** Same shape as the segmented control's `null`
  ↔ "all": an unset filter is `null` and gets dropped from the request,
  while a text input's unset value is `""`. Sending the empty string
  instead is a 400 here rather than an ignored parameter. The value is
  trimmed on the way out, because every text filter this API offers is a
  partial match, so a stray trailing space narrows the result rather than
  being ignored.
- **The debounce.** 400ms, matching what `useServerTableState` already
  applies to search, and for the same reason: without it, typing `santos`
  puts six requests on the wire, one per prefix.

**It holds the draft, not the filter.** The committed value stays where
every other filter's does — in `useServerTableState`, in the query key and
in the URL. The draft only exists so that what the user has typed survives
the 400ms before it becomes a filter, and it re-syncs when the value
changes from outside the control (a restored URL, back/forward navigation)
without clobbering a half-typed word.

**There is deliberately no `TableFilterSelect`.** A dropdown filter composes
Mantine's `Select` directly, in the feature: `Select` already holds
`string | null`, and `clearable` already reports `null` when cleared, so
there is no bridge to own and no debounce to apply. A wrapper would forward
six props unchanged and add a name to look up. That is the test for
promoting a control here — it earns the place by owning something a
re-implementation gets wrong, not by resembling one that does.

---

## DateRangeFilter

A date-range picker for table filters, plus the one function in the app that
knows what a date looks like on the wire.

```tsx
import { DateRangeFilter, EMPTY_DATE_RANGE } from "@/components/ui/date-range";

const [range, setRange] = useState(EMPTY_DATE_RANGE);

<DateRangeFilter value={range} onChange={setRange} />;
```

| Export             | Purpose                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `DateRangeFilter`  | The control. Controlled — takes `value` / `onChange`, plus optional `label` and `placeholder`. |
| `DateRangeValue`   | `{ from: ApiDate \| null; to: ApiDate \| null }`. Each end is either an `ApiDate` or absent. |
| `EMPTY_DATE_RANGE` | The "no date filter" value. Use it as the initial value.                                     |
| `toApiDate`        | Converts a `Date` or a response timestamp to `Y-m-d`. The only producer of `ApiDate`.        |
| `nextDateRange`    | The pure emit rule the control uses. Exported for testing, not for call sites.               |

### Why the wire format is a type

The API accepts date filters only as `Y-m-d`, and rejects anything else with
a 422 rather than coercing it (see `BACKEND_NOTES.md`). `ApiDate` is a
branded string with exactly one producer, `toApiDate`, so a date filter in
the wrong format is a compile error rather than a runtime 422 on a page
nobody tested with a real date.

**The asymmetry this guards:** responses carry full timestamps
(`TransactionResource.date` is `created_at`), requests accept only date-only
strings. A value read out of a response is never directly reusable as a
filter — `toApiDate` is what makes it usable, and a "filter to this row's
day" feature must go through it.

`toApiDate` treats its two input kinds differently, on purpose. A `Date` came
from a picker and is read in **local** calendar components: in UTC+8, a day
picked as Aug 24 is `Aug 23T16:00Z`, so `toISOString()` would filter to the
day before the one the user clicked. A string came from the API and is
**truncated**, not reparsed: the backend runs on UTC, so its date comparisons
are UTC-day comparisons, and a late-evening UTC timestamp reparsed locally
would ask for a different day than the row is filed under.

### A half-picked range is not a filter

Selecting one end of the range updates the calendar and emits nothing. The
API's `to_date` carries `after_or_equal:from_date`, so publishing a one-ended
range would put an error on screen while the user is still choosing. The rule
lives in `nextDateRange` as a pure function, and the half-picked state stays
as draft state inside the control rather than being pushed up and filtered
back out by every consumer.

Clearing both ends *does* emit `EMPTY_DATE_RANGE`. That is a real value
meaning "no date filter", and it is how a user gets back to the unfiltered
view.

---

## Where new global components go

- Generic, reusable, no domain knowledge → `components/ui/<name>/`, compound
  pattern if it has more than one visual "part" or meaningful configuration.
- Domain-specific, even if visually similar to something above → belongs in
  `features/<feature>/components/`, not here.
- One-off, single-use → doesn't need extraction at all; keep it inline where
  it's used until (if) a second use case appears.
