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
`urlKey` string. When provided, page/pageSize/search/sort state is synced to
the URL's search params instead of living in local `useState` — so filters
survive a refresh, back/forward navigation, and are shareable as a link.

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
`suppliers_size`, not generic `page`/`q`/`sort`.

**Two independent debounces on search.** Typing goes into a local draft
first, debounced 400ms before it's written to the URL. For
`useServerTableState`, the network request has its own separate 400ms
debounce on top of that — they're deliberately decoupled, so URL sync isn't
gated on request timing (or vice versa).

**Defaults are omitted from the URL**, not written explicitly — page 1,
the default page size, and an unsorted state all collapse to "no param"
rather than `?page=1`. Keeps shareable URLs clean instead of noisy.

**Search and sort changes reset the page param.** Filtering or re-sorting
with a stale page number would risk showing an empty page, so both clear
`page` back to its default (omitted) whenever they fire.

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

## Where new global components go

- Generic, reusable, no domain knowledge → `components/ui/<name>/`, compound
  pattern if it has more than one visual "part" or meaningful configuration.
- Domain-specific, even if visually similar to something above → belongs in
  `features/<feature>/components/`, not here.
- One-off, single-use → doesn't need extraction at all; keep it inline where
  it's used until (if) a second use case appears.
