import type { TableFilters } from "./types";

/**
 * Whether a table's date range is worth a request. Half a range is a 422
 * everywhere in this API (`to_date` carries `after_or_equal:from_date`),
 * and a restored URL can carry one even though `DateRangeFilter` never
 * emits one.
 *
 * Here rather than in a feature: this tier owns `TableFilters` and the
 * `filtersUsable` option, and the rule is the same wire fact for every
 * page with a date range.
 */
export const dateRangeFiltersUsable = (filters: TableFilters) =>
  Boolean(filters.from_date) === Boolean(filters.to_date);
