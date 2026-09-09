import type { TableFilters } from "./types";

/** Half a date range is a 422 everywhere in this API (`to_date` carries
 * `after_or_equal:from_date`); a restored URL is how one arrives. */
export const dateRangeFiltersUsable = (filters: TableFilters) =>
  Boolean(filters.from_date) === Boolean(filters.to_date);

/** The stricter guard, for the one endpoint that validates both ends as
 * `required` rather than `nullable`: `GET /reports/services-sold/{service}`.
 * An absent range there is a 422 too, not an unfiltered request, so
 * `dateRangeFiltersUsable` would wave through the case that fails. */
export const dateRangeFiltersRequired = (filters: TableFilters) =>
  Boolean(filters.from_date) && Boolean(filters.to_date);
