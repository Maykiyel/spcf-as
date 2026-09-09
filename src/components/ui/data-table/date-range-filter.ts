import type { TableFilters } from "./types";

/** The period a table's date range currently holds: its two filter values,
 * which are strings off the URL or `null`. */
export type DateRangePeriod = { from: string | null; to: string | null };

/** A table's date range, declared once. Expands into the `from_date`/
 * `to_date` filter pair, the guard that pair needs, and the period a link
 * built from this table carries. */
export type DateRangeSpec = {
  /** Both ends must be present, not merely agree: `GET
   * /reports/services-sold/{service}` validates them as `required`. */
  required?: boolean;
  /** The range this table opens on. Called once per mount, deliberately: a
   * filter equal to its declared value is the one dropped from the URL, so
   * a default that moved would erase the period a user just picked. */
  default?: () => DateRangePeriod;
};

const NO_PERIOD: DateRangePeriod = { from: null, to: null };

/** Half a date range is a 422 everywhere in this API (`to_date` carries
 * `after_or_equal:from_date`); a restored URL is how one arrives. An absent
 * range passes here and fails under `required`. */
export const dateRangeUsable = (
  filters: TableFilters,
  required = false,
): boolean =>
  required
    ? Boolean(filters.from_date) && Boolean(filters.to_date)
    : Boolean(filters.from_date) === Boolean(filters.to_date);

export const dateRangePeriod = (filters: TableFilters): DateRangePeriod => ({
  from: filters.from_date ?? null,
  to: filters.to_date ?? null,
});

export const dateRangeInitialFilters = (
  period: DateRangePeriod,
): TableFilters => ({ from_date: period.from, to_date: period.to });

export const resolveDateRangeDefault = (spec: DateRangeSpec): DateRangePeriod =>
  spec.default ? spec.default() : NO_PERIOD;
