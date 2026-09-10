import type { ReactNode } from "react";

type ColumnDefBase = {
  header: string;
  /** The name the endpoint allow-lists for this column's sort, when that
   * isn't the field the cell reads (`/transactions` sorts `date` as
   * `created_at`). A column sorts exactly when this, or its `field`, is in
   * the endpoint's sort plan; there is no `sortable` to set. */
  sortKey?: string;
};

/** A column that reads a field off the row. `id` only when two columns read
 * the same one. */
type FieldColumn<T> = ColumnDefBase & {
  field: keyof T & string;
  id?: string;
  render?: (row: T) => ReactNode;
};

/** A column that renders something the row has no single field for: an
 * action, a badge, a toggle. It has an identity and no field, which is what
 * stops it being mistaken for sortable. */
type RenderedColumn<T> = ColumnDefBase & {
  id: string;
  field?: never;
  render: (row: T) => ReactNode;
};

/**
 * One column, as declared. `field`, `id` and `sortKey` name three separate
 * jobs that a single `key` used to do at once: what the cell reads, what
 * identifies the column, and what the wire calls its sort.
 */
export type ColumnDef<T> = FieldColumn<T> | RenderedColumn<T>;

/** A column as the table hands it back, with sortability resolved against
 * the endpoint's plan. Declared columns never carry it. */
export type ResolvedColumn<T> = ColumnDef<T> & { sortable: boolean };

export type SortDirection = "asc" | "desc" | null;

/** An active sort column. A column with no direction isn't in the array at
 * all. See `sortsAfterClick` in `use-table-controls.ts` for the cycle
 * rules. */
export type SortEntry = {
  key: string;
  direction: "asc" | "desc";
};

/** Hard cap on active sort columns, frontend-only (ADR 0002). */
export const MAX_SORT_COLUMNS = 2;

/** Server-side filter values, keyed by the API's own filter name. `null`
 * means "not set" and is dropped from the request.
 *
 * Strings only, because filters round-trip through the URL. Converting to
 * what the wire wants belongs in the feature's `getX`. The carve-out is a
 * boolean, which carries `1`/`0` here: those are already URL-safe and
 * already what the endpoint takes. */
export type TableFilters = Record<string, string | null>;

export type DataTableContextValue<T> = {
  columns: ResolvedColumn<T>[];
  rows: T[]; // current page's rows, already filtered/sorted/sliced
  totalCount: number; // total matching rows, pre-pagination
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string | null;

  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Ordered by priority, capped at MAX_SORT_COLUMNS.
  sorts: SortEntry[];
  onSort: (key: string) => void;
};

/** What one filter control is handed: the current value and a way to report
 * a change, with the key already closed over. */
export type TableFilterBinding = {
  value: string | null;
  onChange: (value: string | null) => void;
};

/** What the provider actually carries. `filters` and `setFilters` are here
 * and deliberately not on `DataTableContextValue`: `useTableFilters` and
 * `useTableDateRange` are the only supported ways in, so a panel cannot
 * rebuild the read-by-key/write-as-patch bridge by hand. */
export type DataTableProviderValue<T> = DataTableContextValue<T> & {
  filters: TableFilters;
  setFilters: (patch: TableFilters) => void;
};
