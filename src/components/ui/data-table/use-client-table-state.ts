import { useMemo } from "react";
import type { ColumnDef } from "./types";
import { useTableControls } from "./use-table-controls";

type UseClientTableStateOptions<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  initialPageSize?: number;
  urlKey?: string;
};

export function useClientTableState<T extends Record<string, any>>({
  data,
  columns,
  initialPageSize = 25,
  urlKey,
}: UseClientTableStateOptions<T>) {
  const {
    page,
    pageSize,
    searchQuery,
    sorts,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSort,
  } = useTableControls(initialPageSize, urlKey);

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
    if (sorts.length === 0) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      for (const { key, direction } of sorts) {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal === bVal) continue;
        const result = aVal > bVal ? 1 : -1;
        return direction === "asc" ? result : -result;
      }
      return 0;
    });
    return copy;
  }, [filtered, sorts]);

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
    sorts,
    onSort,
  };
}
