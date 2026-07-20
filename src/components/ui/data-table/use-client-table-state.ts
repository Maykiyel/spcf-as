import { useMemo, useState } from "react";
import type { ColumnDef, SortDirection } from "./types";

type UseClientTableStateOptions<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  initialPageSize?: number;
};

export function useClientTableState<T extends Record<string, any>>({
  data,
  columns,
  initialPageSize = 25,
}: UseClientTableStateOptions<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) =>
      columns.some((col) =>
        String(row[col.key] ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [data, columns, searchQuery]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDirection) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      const result = aVal > bVal ? 1 : -1;
      return sortDirection === "asc" ? result : -result;
    });
    return copy;
  }, [filtered, sortKey, sortDirection]);

  const totalCount = sorted.length;

  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const onSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortKey(null);
      setSortDirection(null);
    }
    setPage(1);
  };

  const onSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1); // reset to page 1 — a stale page number after filtering would show an empty page
  };

  return {
    columns,
    rows,
    totalCount,
    isLoading: false,
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    searchQuery,
    onSearchChange,
    sortKey,
    sortDirection,
    onSort,
  };
}
