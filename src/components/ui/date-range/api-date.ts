/** A date in the only shape the API accepts as a filter: `Y-m-d`.
 *
 * Branded so it cannot be produced by writing a string literal or by
 * interpolating one. `toApiDate` is the only way to obtain a value of this
 * type, which makes "the wire format is correct" a compile-time property
 * rather than something every call site has to remember (see
 * BACKEND_NOTES.md — anything but `Y-m-d` is a 422, not a coercion). */
export type ApiDate = string & { readonly __brand: "ApiDate" };

// Matches a date-only value ("2026-08-24") as distinct from a full
// timestamp ("2026-08-24T06:30:00.000000Z").
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Leading date part of an ISO-8601 timestamp.
const ISO_DATE_PART = /^(\d{4}-\d{2}-\d{2})T/;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Converts a date value to the API's wire format. The single place in the
 * app that knows what that format is.
 *
 * The two accepted inputs mean different things, and are deliberately
 * handled differently:
 *
 * - A `Date` comes from a picker, where the user chose a calendar date in
 *   their own calendar. Its **local** components are taken. Going through
 *   `toISOString()` here would be wrong in UTC+8: a date picked as Aug 24
 *   is Aug 23T16:00Z, and the filter would silently ask for the day before
 *   the one the user clicked.
 *
 * - A `string` is a timestamp read back out of an API response, which is
 *   already in the API's own calendar. The backend runs on UTC
 *   (`config/app.php`), so its date comparisons are UTC-day comparisons —
 *   the date part is truncated off the string rather than reparsed, so a
 *   late-evening UTC timestamp isn't shifted a day forward on the way back
 *   in.
 *
 * That asymmetry is the whole reason this function exists: responses carry
 * full timestamps, requests accept only date-only strings, so a value read
 * from a response is never directly reusable as a filter.
 *
 * Returns `null` for a value that isn't a usable date, so a bad value drops
 * the filter rather than sending a 422.
 */
export function toApiDate(value: Date | string | null | undefined): ApiDate | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    if (DATE_ONLY.test(value)) return value as ApiDate;

    const isoDatePart = ISO_DATE_PART.exec(value);
    if (isoDatePart) return isoDatePart[1] as ApiDate;

    // Not a shape the API ever sends. Parse it as a last resort rather than
    // guessing at its text, and fall through to the same local-components
    // rule a picker value gets.
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return fromLocalComponents(parsed);
  }

  if (Number.isNaN(value.getTime())) return null;
  return fromLocalComponents(value);
}

function fromLocalComponents(date: Date): ApiDate {
  const formatted = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
  return formatted as ApiDate;
}
