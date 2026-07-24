import { useMemo } from "react";
import type { ColumnDef } from "./types";
import { useTableControls } from "./use-table-controls";

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
  const {
    page,
    pageSize,
    searchQuery,
    sortKey,
    sortDirection,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSort,
  } = useTableControls(initialPageSize);

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

  return {
    columns,
    rows,
    totalCount,
    isLoading: false,
    isError: false,
    errorMessage: null,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    searchQuery,
    onSearchChange,
    sortKey,
    sortDirection,
    onSort,
  };
}
