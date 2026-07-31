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
