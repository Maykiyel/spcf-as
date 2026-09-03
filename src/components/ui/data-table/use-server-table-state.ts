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
  /** The sort this table starts on, and the one it treats as its default.
   *
   * Declare it when the endpoint has a `defaultSort` the user should be
   * able to see: without it the table sends no sort, the endpoint applies
   * its own, and the header shows no caret while the rows are plainly
   * ordered by that column — so the first click on it appears to do
   * nothing but reverse a sort nobody indicated was there.
   *
   * Declared here rather than passed to the fetcher because it is a
   * default, and defaults belong where page size and filter defaults
   * already are: omitted from the URL, restored on a fresh visit, and
   * still overridable. Turning the sort off writes an explicit marker,
   * since an absent param means "use this".
   *
   * Keys must be ones the endpoint allow-lists, exactly like `sortable`
   * columns — this one reaches the wire on the very first request, so
   * getting it wrong is a 422 before the user touches anything. */
  initialSorts?: SortEntry[];
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

  // Debounce search before it ever reaches the network. Independent of the
  // debounce (if any) `useTableControls` applies before writing to the URL —
  // they're decoupled on purpose, so URL sync isn't gated on request timing.
  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  // `filters` is part of the key, not just of the request. That is the whole
  // point of the hook owning them. The mechanism this replaces —
  // `createListAdapter(params, extra)` — hands the fetcher values it never
  // puts in the key, so every consumer has to remember to add them to its own
  // `queryKey` by hand. Services was the only one that ever did, and #84
  // moved it here; a filter that misses the key serves the previous
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
