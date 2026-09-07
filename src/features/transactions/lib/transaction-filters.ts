import type { TableFilters } from "@/components/ui/data-table";

/**
 * Whether the filters are worth a request. Half a date range is a 422
 * (`to_date` carries `after_or_equal:from_date`), and a restored URL can
 * carry one even though `DateRangeFilter` never emits one.
 *
 * In `lib/` rather than beside the panel: a component file that also
 * exports a function breaks Fast Refresh for the components in it.
 */
export const transactionFiltersUsable = (filters: TableFilters) =>
  Boolean(filters.from_date) === Boolean(filters.to_date);
