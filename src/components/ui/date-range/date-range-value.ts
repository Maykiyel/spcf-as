import { toApiDate, type ApiDate } from "./api-date";

/** A usable range or none at all. A half-picked range is draft state inside
 * the control and never reaches a consumer. See `nextDateRange`. */
export type DateRangeValue = {
  from: ApiDate | null;
  to: ApiDate | null;
};

export const EMPTY_DATE_RANGE: DateRangeValue = { from: null, to: null };

/**
 * The control's emit rule: the range to publish, or `null` for "not a
 * filter yet".
 *
 * One end alone publishes nothing, because `to_date` carries
 * `after_or_equal:from_date` and half a range is a 422. Clearing both
 * *does* publish: `{from: null, to: null}` means "no date filter" and is
 * how a user gets back to the unfiltered view.
 */
export function nextDateRange(
  range: [Date | string | null, Date | string | null],
): DateRangeValue | null {
  const from = toApiDate(range[0]);
  const to = toApiDate(range[1]);

  if (from && to) return { from, to };
  if (!from && !to) return EMPTY_DATE_RANGE;

  return null;
}
