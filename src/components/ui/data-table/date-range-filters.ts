import type { TableFilters } from "./types";

/** Half a date range is a 422 everywhere in this API (`to_date` carries
 * `after_or_equal:from_date`); a restored URL is how one arrives. */
export const dateRangeFiltersUsable = (filters: TableFilters) =>
  Boolean(filters.from_date) === Boolean(filters.to_date);

/** The stricter guard: an absent range is a 422 too, which the pair check
 * above passes. `GET /reports/services-sold/{service}` validates both ends
 * as `required`. */
export const dateRangeFiltersRequired = (filters: TableFilters) =>
  Boolean(filters.from_date) && Boolean(filters.to_date);
