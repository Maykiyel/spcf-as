import { useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { notifications } from "@mantine/notifications";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { ColumnDef, SortEntry, TableFilters } from "./types";
import { useTableControls } from "./use-table-controls";

export type ServerTableParams = {
  page: number;
  per_page: number;
  search?: string;
  sorts: SortEntry[];
  filters?: TableFilters;
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
  urlKey?: string;
  /** The filters this table has, with their unfiltered values. Declared
   * once here; caching, page reset and (given a `urlKey`) URL persistence
   * follow from it. */
  initialFilters?: TableFilters;
  /** The sort this table starts on and treats as its default. Declare it
   * when the endpoint has its own `defaultSort`, or the header shows no
   * caret over rows that are plainly ordered. Keys must be ones the
   * endpoint allow-lists: this reaches the wire on the first request. */
  initialSorts?: SortEntry[];
  /** Whether the current filters are worth a request. For filters whose
   * ends must agree: half a date range is a 422, and a restored URL can
   * carry one even though the control never emits one. */
  filtersUsable?: (filters: TableFilters) => boolean;
};

export function useServerTableState<T extends Record<string, any>>({
  queryKey,
  queryFn,
  columns,
  initialPageSize = 25,
  urlKey,
  initialFilters,
  initialSorts,
  filtersUsable,
}: UseServerTableStateOptions<T>) {
  const {
    page,
    pageSize,
    searchQuery,
    sorts,
    filters,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSort,
    resetSort,
    setFilters,
  } = useTableControls(initialPageSize, urlKey, initialFilters, initialSorts);

  // Debounced before the network, independently of the URL-write debounce
  // in `useTableControls`, so URL sync isn't gated on request timing.
  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  // `filters` is in the key, not just the request: a filter that misses the
  // key serves the previous filter's cached rows with no error at all.
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: [...queryKey, page, pageSize, debouncedSearch, sorts, filters],
    queryFn: () =>
      queryFn({
        page,
        per_page: pageSize,
        search: debouncedSearch || undefined,
        sorts,
        filters,
      }),
    placeholderData: keepPreviousData, // keeps old rows visible while the next page loads, instead of a flash to empty
    // Disabled means `isLoading` stays false, so the table shows its empty
    // state rather than spinning on a range that can't be completed.
    enabled: filtersUsable ? filtersUsable(filters) : true,
  });

  useEffect(() => {
    if (!isError || sorts.length === 0) return;
    const status =
      error instanceof AxiosError ? error.response?.status : undefined;
    if (status !== 422) return;

    resetSort();
    notifications.show({
      color: "danger",
      message: "That column can't be sorted.",
    });
  }, [isError, error, sorts, resetSort]);

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
    sorts,
    onSort,
    filters,
    setFilters,
  };
}
