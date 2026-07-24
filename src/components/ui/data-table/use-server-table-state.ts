import { useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { notifications } from "@mantine/notifications";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { ColumnDef } from "./types";
import { useTableControls } from "./use-table-controls";

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
    resetSort,
  } = useTableControls(initialPageSize);

  // Debounce search before it ever reaches the network
  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  const { data, isLoading, isFetching, isError, error } = useQuery({
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

  useEffect(() => {
    if (!isError || !sortKey) return;
    const status =
      error instanceof AxiosError ? error.response?.status : undefined;
    if (status !== 422) return;

    resetSort();
    notifications.show({
      color: "danger",
      message: "That column can't be sorted.",
    });
  }, [isError, error, sortKey, resetSort]);

  return {
    columns,
    rows: data?.data ?? [],
    totalCount: data?.total ?? 0,
    isLoading: isLoading || isFetching,
    isError,
    errorMessage: isError ? "Couldn't load data. Please try again." : null,
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
