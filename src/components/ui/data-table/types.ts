import type { ReactNode } from "react";

export type ColumnDef<T> = {
  key: keyof T & string;
  id?: string;
  header: string;
  sortable?: boolean;
  /** The name the endpoint allow-lists for this column's sort, when it
   * isn't the field the cell reads (`/transactions` sorts `date` as
   * `created_at`). Only meaningful with `sortable`; getting it wrong is a
   * 422 on the first header click. Defaults to `key`. */
  sortKey?: string;
  render?: (row: T) => ReactNode;
};

export type SortDirection = "asc" | "desc" | null;

/** An active sort column. A column with no direction isn't in the array at
 * all. See `nextSorts` in `use-table-controls.ts` for the cycle rules. */
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
  columns: ColumnDef<T>[];
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
