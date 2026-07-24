import { useState } from "react";
import type { SortDirection } from "./types";

type SortState = {
  key: string | null;
  direction: SortDirection;
};

export type TableControls = {
  page: number;
  pageSize: number;
  searchQuery: string;
  sortKey: string | null;
  sortDirection: SortDirection;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSearchChange: (query: string) => void;
  onSort: (key: string) => void;
  resetSort: () => void;
};

export function useTableControls(initialPageSize = 25): TableControls {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState("");

  const [sort, setSort] = useState<SortState>({ key: null, direction: null });

  const onSort = (key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: null };
    });
    setPage(1);
  };

  const resetSort = () => setSort({ key: null, direction: null });

  const onSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1); // stale page after filtering would show an empty page
  };

  const onPageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    page,
    pageSize,
    searchQuery,
    sortKey: sort.key,
    sortDirection: sort.direction,
    onPageChange: setPage,
    onPageSizeChange,
    onSearchChange,
    onSort,
    resetSort,
  };
}
