import { useEffect, useMemo, useRef } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { notifications } from "@mantine/notifications";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { ColumnDef, SortEntry, TableFilters } from "./types";
import {
  dateRangeInitialFilters,
  dateRangePeriod,
  dateRangeUsable,
  resolveDateRangeDefault,
  type DateRangePeriod,
  type DateRangeSpec,
} from "./date-range-filter";
import { useTableControls } from "./use-table-controls";

export type ServerTableParams = {
  page: number;
  per_page: number;
  search?: string;
  sorts: SortEntry[];
  filters?: TableFilters;
};

export type ServerTableResponse<T, TMeta = undefined> = {
  data: T[];
  total: number;
  /** Whatever the envelope carries beside the rows, for the adapters that
   * declare a `selectMeta`. Absent on every other one. */
  meta?: TMeta;
};

type UseServerTableStateOptions<T, TMeta> = {
  queryKey: unknown[];
  queryFn: (params: ServerTableParams) => Promise<ServerTableResponse<T, TMeta>>;
  /** A function when a cell needs the period the table is on, which is
   * resolved after this hook is called: the Services Sold row link carries
   * it to the breakdown. */
  columns:
    | ColumnDef<T>[]
    | ((context: { period: DateRangePeriod }) => ColumnDef<T>[]);
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
  /** Whether `initialSorts` already orders the rows completely, which is
   * true when it ends in a unique key. The first click on another column
   * then replaces it instead of joining behind it, since nothing appended
   * after a total order can reorder anything. */
  initialSortsAreTotalOrder?: boolean;
  /** This table's date range, if it has one. Declaring it is what supplies
   * the `from_date`/`to_date` pair, the guard keeping half a range off the
   * wire, and the period a link out of this table carries — none of which
   * a page can now state without the others. */
  dateRange?: DateRangeSpec;
};

export function useServerTableState<
  T extends Record<string, any>,
  TMeta = undefined,
>({
  queryKey,
  queryFn,
  columns,
  initialPageSize = 25,
  urlKey,
  initialFilters,
  initialSorts,
  initialSortsAreTotalOrder,
  dateRange,
}: UseServerTableStateOptions<T, TMeta>) {
  // Resolved on first render and never again: a filter equal to its declared
  // value is the one dropped from the URL, so a default that moved mid-mount
  // would erase the period a user had just picked.
  const defaultPeriodRef = useRef<DateRangePeriod | null | undefined>(
    undefined,
  );
  if (defaultPeriodRef.current === undefined) {
    defaultPeriodRef.current = dateRange
      ? resolveDateRangeDefault(dateRange)
      : null;
  }
  const defaultPeriod = defaultPeriodRef.current;

  const declaredFilters = useMemo(
    () =>
      defaultPeriod
        ? { ...initialFilters, ...dateRangeInitialFilters(defaultPeriod) }
        : initialFilters,
    [initialFilters, defaultPeriod],
  );

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
  } = useTableControls(
    initialPageSize,
    urlKey,
    declaredFilters,
    initialSorts,
    initialSortsAreTotalOrder,
  );

  const period = dateRangePeriod(filters);

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
    enabled: dateRange ? dateRangeUsable(filters, dateRange.required) : true,
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
    columns: typeof columns === "function" ? columns({ period }) : columns,
    rows: data?.data ?? [],
    totalCount: data?.total ?? 0,
    meta: data?.meta,
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
    /** The declared range's current value, for a link out of this table.
     * `{from: null, to: null}` on a table that declares none. */
    period,
  };
}
