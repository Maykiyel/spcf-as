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

A compound component for tabular data: card wrapper, toolbar (entries-per-page +
search), the table itself, and pagination. State (search query, sort, page) is
shared via context — no prop drilling between pieces.

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
      <DataTable.Toolbar />
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
```

### Pieces

| Piece                  | Purpose                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `DataTable.Root`       | Provides context, wraps children in `Card`. Takes `title` and `state`.                             |
| `DataTable.Toolbar`    | "Show N entries" select + search input. Omit for a table with no search/page-size controls.        |
| `DataTable.Grid`       | The actual `<table>` — headers (with sort toggle if `sortable: true`), rows, empty state.          |
| `DataTable.Pagination` | "Showing X to Y of Z entries" + page control. Omit for a table that shows all rows with no paging. |

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

For large, unbounded datasets (invoices, transactions, audit logs), a
`useServerTableState` hook should be built when the first such table is needed —
it would wrap a `useQuery` call and send `page`/`search`/`sort` as API query
params instead of filtering in-browser. **Not built yet — build it when a real
table needs it, not preemptively.**

Both hooks return the same shape (`DataTableContextValue<T>`), so
`DataTable.Toolbar` / `.Grid` / `.Pagination` never change regardless of which
one a given table uses. This is the `state-context-interface` pattern — the UI
is dependency-injected with state, not coupled to one implementation.

---

## Where new global components go

- Generic, reusable, no domain knowledge → `components/ui/<name>/`, compound
  pattern if it has more than one visual "part" or meaningful configuration.
- Domain-specific, even if visually similar to something above → belongs in
  `features/<feature>/components/`, not here.
- One-off, single-use → doesn't need extraction at all; keep it inline where
  it's used until (if) a second use case appears.
