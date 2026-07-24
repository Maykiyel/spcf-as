import type { ReactNode } from "react";

export type ColumnDef<T> = {
  key: keyof T & string;
  id?: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
};

export type SortDirection = "asc" | "desc" | null;

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

  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
};
