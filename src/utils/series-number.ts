/** The width of the number printed on a physical series receipt sheet. It
 * comes from the booklet, not from the data: the stored values are unsigned
 * integers seeded from 1. */
const SERIES_NUMBER_WIDTH = 6;

const NOT_ASSIGNED = "—";

/**
 * A series number as the booklet prints it — `123` reads `000123`.
 *
 * Padded to a width rather than by a fixed count, so every number is the
 * same shape; one already that wide or wider is returned as it is rather
 * than truncated. `null` is a transaction with no sheet drawn yet, and
 * reads as a dash because a blank beside a label reads as a bug.
 *
 * For reading only. An input holding a series number keeps the plain
 * number: a field that shows leading zeros invites typing them back in,
 * and it cannot keep them.
 */
export function formatSeriesNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return NOT_ASSIGNED;
  return String(value).padStart(SERIES_NUMBER_WIDTH, "0");
}

/**
 * Undoes that padding for a search term, because the screen now shows a
 * number the wire does not store.
 *
 * Narrow on purpose: only a term that is entirely digits is corrected, so
 * the Series Receipts box stays usable for a cashier's name, and a term of
 * only zeros is left alone because there is no number under it.
 */
export function stripSeriesNumberPadding(term: string): string {
  if (!/^\d+$/.test(term)) return term;
  const stripped = term.replace(/^0+/, "");
  return stripped === "" ? term : stripped;
}
