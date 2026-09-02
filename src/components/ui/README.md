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
  useClientTableState,
  type ColumnDef,
} from "@/components/ui/data-table";

const columns: ColumnDef<Supplier>[] = [
  { key: "id", header: "ID", sortable: true },
  { key: "supplierName", header: "Supplier Name", sortable: true },
  { key: "contactNo", header: "Contact No", sortable: true },
  { key: "emailAddress", header: "Email Address", sortable: true },
  {
    key: "id", // still required — used for cell value lookup on non-render columns
    id: "actions", // REQUIRED whenever `key` collides with another column (e.g. actions cols)
    header: "Actions",
    render: (row) => <SupplierActionsCell supplier={row} />,
  },
];

function SupplierTable({ data }: { data: Supplier[] }) {
  const tableState = useClientTableState({ data, columns });

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
| `DataTable.Search`     | The search input. Right-aligns itself. **Only compose this on an endpoint that accepts a search filter** — see below. |
| `DataTable.Grid`       | The actual `<table>` — headers (with sort toggle if `sortable: true`), rows, loading/error/empty states. |
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
  <ServiceStatusFilter urlKey={URL_KEY} />
  <DataTable.Search />
</DataTable.Toolbar>
```

**Don't add a boolean prop to vary this.** "Omit the piece you don't need" is
how this component already varies; a `showSearch` flag would be a second,
contradictory way to say the same thing, and the variation after that would
want a third.

The matching half of the rule lives on the list adapter: `createListAdapter`
sends `filter[search]` only for endpoints that opt in with
`{ supportsSearch: true }`. Composing `DataTable.Search` on a table whose
adapter hasn't opted in gives you a box that does nothing, so the two go
together.

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
  the hook owns them. The workaround this replaced passed filter values to
  the fetcher while leaving them out of the key, so changing a filter served
  the previous filter's cached rows — with no error, which is the worst
  available failure.
- **Changing a filter resets to page 1**, for the same reason changing
  search or sort does.
- **They reach the wire as `filter[<key>]`**, which is what every filterable
  endpoint here calls them, so a feature's `getX` needs no mapping of its
  own. A `null` value is dropped from the request rather than sent empty —
  an unknown or empty filter key is a 400 here (see `BACKEND_NOTES.md`).

Key the filters by the API's own filter name (`from_date`, not `dateFrom`)
so that mapping stays a no-op. `TableFilters` values are `string | null` and
nothing else: they round-trip through the URL, which has only strings, so
another type would need a per-filter decoder on the way back in. Converting
to the shape the endpoint wants — a boolean as `0`/`1`, an id as a number —
belongs in that feature's `getX` via the adapter's `extra` argument.

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
sort. The toolbar's children are written by the same component that calls
`useServerTableState`, so there is no prop drilling for a context to remove
here — it would only add a second way to reach the same values. Page and
sort are on the context because `DataTable.Pagination` and `DataTable.Grid`
are shared pieces that genuinely can't be handed props by the page.

### `ColumnDef<T>`

```typescript
type ColumnDef<T> = {
  key: keyof T & string; // which field this column reads (and the default sort/search key)
  id?: string; // set this if `key` collides with another column (e.g. two columns both keyed on 'id')
  header: string; // column header label
  sortable?: boolean; // enables the sort-toggle icons in the header
  render?: (row: T) => ReactNode; // custom cell content — omit to just print the raw field value
};
```

**Always set `id` on an "Actions" column** (or any column reusing another
column's `key`) — `DataTable.Grid` uses `col.id ?? col.key` as the React list
key internally. Without `id`, duplicate keys cause silent rendering bugs on
sort/page changes.

**Only mark a column `sortable: true` if the backend actually allow-lists it**
(see `BACKEND_NOTES.md` — the sort allow-list doesn't necessarily cover every
visible column, and changes over time). If it drifts out of sync,
`useServerTableState` recovers automatically (see below) rather than leaving
the table stuck — but it's still worth getting right at the source.

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

### State: client-side vs. server-side

`useClientTableState` filters, sorts, and paginates an in-memory array — use it
for small, bounded datasets (suppliers, categories, user accounts).

`useServerTableState` wraps a `useQuery` call and sends `page`/`search`/`sort`
as API query params instead of filtering in-browser — use it for large,
unbounded datasets (invoices, transactions, audit logs). Search is debounced
400ms before it hits the network, and paging/sorting/searching keeps the
previous page's rows visible while the next request is in flight
(`keepPreviousData`) instead of flashing to empty.

Both hooks return the same shape (`DataTableContextValue<T>`), so
`DataTable.Toolbar` / `.PageSize` / `.Search` / `.Grid` / `.Pagination` never
change regardless of which
one a given table uses. This is the `state-context-interface` pattern — the UI
is dependency-injected with state, not coupled to one implementation. Swapping
a table from one to the other later (e.g. a client-side list outgrows itself)
is a one-line change at the call site — nothing in `DataTable.*` needs to know.

**Under the hood**, both hooks are built on an internal `useTableControls`
hook (not exported — implementation detail of this folder) that owns
page/pageSize/search/sort state and their handlers. This isn't just for DRY:
it's what keeps `useClientTableState` and `useServerTableState`
_behaviorally_ identical, not just shape-identical. Before this existed, the
two hooks separately reimplemented the same sort-cycling and page-reset
logic, which meant they could type-check as interchangeable while quietly
behaving differently — defeating the point of being able to swap them. If you
ever need a third variant (e.g. something websocket-synced), build it on
`useTableControls` too rather than hand-rolling that state again.

### URL-persisted state

Both `useClientTableState` and `useServerTableState` accept an optional
`urlKey` string. When provided, page/pageSize/search/sort state — and, on
`useServerTableState`, the declared filters — is synced to the URL's search
params instead of living in local `useState`, so the view survives a
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

**Two independent debounces on search.** Typing goes into a local draft
first, debounced 400ms before it's written to the URL. For
`useServerTableState`, the network request has its own separate 400ms
debounce on top of that — they're deliberately decoupled, so URL sync isn't
gated on request timing (or vice versa).

**Defaults are omitted from the URL**, not written explicitly — page 1,
the default page size, an unsorted state, and any filter sitting at the
value it was declared with all collapse to "no param" rather than `?page=1`
or `?status=all`. Keeps shareable URLs clean instead of noisy, and stops an
unfiltered table from looking filtered.

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
| Any state, `useClientTableState`               | `isError` is always `false` — there's no network call to fail                |

If you need a custom error message instead of the default "Couldn't load
data. Please try again.", that comes from `errorMessage` in
`use-server-table-state.ts` — edit it there if a specific table needs
different wording; it isn't currently a per-table prop.

### Sort error recovery

If a column is marked `sortable: true` but the backend rejects it (a 422 —
see the allow-list warning under `ColumnDef<T>` above), `useServerTableState`
detects this automatically: it resets the sort to unsorted and shows a toast
via `@mantine/notifications` ("That column can't be sorted.") instead of
leaving the table stuck showing nothing. Any other error (500, network) is
not special-cased this way — it surfaces as the generic error state above.

**This requires `<Notifications />` to be mounted once somewhere in the app
tree** (typically inside `MantineProvider`). If it isn't mounted, the sort
still resets correctly, but the toast explaining why silently does nothing —
worth confirming this is in place before relying on it.

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
| `DateRangeValue`   | `{ from: ApiDate \| null; to: ApiDate \| null }`. Both ends or neither, never one.           |
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
