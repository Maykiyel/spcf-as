import { toApiDate, type ApiDate } from "./api-date";

/** A usable date range, or no range at all. There is no third state here on
 * purpose — a half-picked range is draft state inside the control and never
 * reaches a consumer. See `nextDateRange`. */
export type DateRangeValue = {
  from: ApiDate | null;
  to: ApiDate | null;
};

export const EMPTY_DATE_RANGE: DateRangeValue = { from: null, to: null };

/**
 * The emit rule for the date-range control, as a pure transition: given what
 * the picker now holds, either the range to publish or `null` for "hold,
 * this isn't a filter yet".
 *
 * Selecting one end of a range publishes nothing. Doing otherwise would fire
 * a request the API answers with a 422 (`to_date` carries
 * `after_or_equal:from_date`) while the user is still mid-interaction, and
 * every consumer would have to filter the same half-state back out again.
 *
 * Clearing both ends *does* publish. `{ from: null, to: null }` is a real
 * value meaning "no date filter", and is how a user gets back to the
 * unfiltered view.
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
