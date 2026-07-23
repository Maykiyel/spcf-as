import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { ColumnDef, SortDirection } from "./types";

export type ServerTableParams = {
  page: number;
  per_page: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type ServerTableResponse<T> = {
  data: T[];
  total: number;
};

type UseServerTableStateOptions<T> = {
  queryKey: unknown[];
  queryFn: (params: ServerTableParams) => Promise<ServerTableResponse<T>>;
  columns: ColumnDef<T>[];
  initialPageSize?: number;
};

export function useServerTableState<T extends Record<string, any>>({
  queryKey,
  queryFn,
  columns,
  initialPageSize = 25,
}: UseServerTableStateOptions<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Debounce search before it ever reaches the network
  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      ...queryKey,
      page,
      pageSize,
      debouncedSearch,
      sortKey,
      sortDirection,
    ],
    queryFn: () =>
      queryFn({
        page,
        per_page: pageSize,
        search: debouncedSearch || undefined,
        sortBy: sortKey ?? undefined,
        sortOrder: sortDirection ?? undefined,
      }),
    placeholderData: keepPreviousData, // keeps old rows visible while the next page loads, instead of a flash to empty
  });

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
    setPage(1);
  };

  return {
    columns,
    rows: data?.data ?? [],
    totalCount: data?.total ?? 0,
    isLoading: isLoading || isFetching,
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
