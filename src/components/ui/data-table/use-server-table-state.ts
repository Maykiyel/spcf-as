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
  /** Whether the current filter values are worth a request. Defaults to
   * always.
   *
   * This exists for filters whose ends have to agree. A date range with only
   * one end set is not a filter yet, and the API answers it with a 422
   * because `to_date` carries `after_or_equal:from_date`. `DateRangeFilter`
   * never emits a half-picked range, but a restored URL can still carry one,
   * so the guard belongs here as well as in the control. */
  filtersUsable?: (filters: TableFilters) => boolean;
};

export function useServerTableState<T extends Record<string, any>>({
  queryKey,
  queryFn,
  columns,
  initialPageSize = 25,
  urlKey,
  initialFilters,
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
  } = useTableControls(initialPageSize, urlKey, initialFilters);

  // Debounce search before it ever reaches the network. Independent of the
  // debounce (if any) `useTableControls` applies before writing to the URL —
  // they're decoupled on purpose, so URL sync isn't gated on request timing.
  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  // `filters` is part of the key, not just of the request. That is the whole
  // point of the hook owning them. The mechanism this replaces —
  // `createListAdapter(params, extra)` — hands the fetcher values it never
  // puts in the key, so every consumer has to remember to add them to its own
  // `queryKey` by hand. Services remembers (see `service-table.tsx`); the
  // next page to use `extra` might not, and forgetting serves the previous
  // filter's cached rows with no error at all.
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
    // A disabled query is never pending *and* fetching, so `isLoading` below
    // stays false and the table shows its empty state rather than spinning
    // forever on a range the user can't complete from here.
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
