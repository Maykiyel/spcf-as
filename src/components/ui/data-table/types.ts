import type { ReactNode } from "react";

export type ColumnDef<T> = {
  key: keyof T & string;
  id?: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
};

export type SortDirection = "asc" | "desc" | null;

/** A single active sort column. `direction` is never null within an active
 * entry — a column with no direction simply isn't present in the `sorts`
 * array. See `nextSorts` in `use-table-controls.ts` for the cycle/eviction
 * rules that produce this array. */
export type SortEntry = {
  key: string;
  direction: "asc" | "desc";
};

/** Hard cap on simultaneously active sort columns. Enforced here on the
 * frontend only (see ADR 0002) — so this is the single source of truth for the limit. */
export const MAX_SORT_COLUMNS = 2;

/** A table's server-side filter values, keyed by the API's own filter name
 * (`status`, `from_date`, `cashier_id`). `null` means "not set" and is what
 * an unfiltered table sends.
 *
 * Values are strings and nothing else, on purpose. Filters round-trip
 * through the URL (see `useTableControls`), which has only strings, so any
 * other type would need a per-filter decoder on the way back in and the
 * declaration site would have to name it. Converting to the shape the wire
 * wants — an id as a number, say — belongs in the feature's own `getX`,
 * which already knows what its endpoint expects.
 *
 * **A boolean is the carve-out: it carries `1`/`0` as its value here.**
 * `filter[is_active]` is a `boolean` rule over a `tinyint`, so `1`/`0` is
 * already a string the endpoint takes and the URL can hold. Converting in
 * `getX` instead would leave the URL reading `accounts_is_active=active` —
 * the wire's key against a value the wire won't accept — and put back the
 * per-consumer mapping step this mechanism removed.
 * `UserAccountStatusFilter` and `ServiceStatusFilter` both do it this way. */
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

  // Ordered by priority — sorts[0] is primary, sorts[1] (if present) is the
  // tiebreaker. Length is always <= MAX_SORT_COLUMNS.
  sorts: SortEntry[];
  onSort: (key: string) => void;
};
