import type { TableFilters } from "@/components/ui/data-table";

/**
 * Whether the transaction filters are in a state worth a request.
 *
 * The recipe from the shared README: while one end of the date range is
 * set and the other isn't, the range isn't a filter yet and the query
 * doesn't run. `to_date` carries `after_or_equal:from_date`, so sending
 * half of one is a 422. `DateRangeFilter` never emits a half-picked range,
 * but a restored URL can still carry one, which is why the guard exists
 * here as well as in the control.
 *
 * Shared because every page mounting `TransactionListFilters` owes the
 * endpoint the same guard, and in `lib/` rather than beside the panel
 * because a component file that also exports a function breaks Fast
 * Refresh for the components in it.
 */
export const transactionFiltersUsable = (filters: TableFilters) =>
  Boolean(filters.from_date) === Boolean(filters.to_date);
