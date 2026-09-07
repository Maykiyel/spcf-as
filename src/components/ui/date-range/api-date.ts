/** A date in the only shape the API accepts as a filter: `Y-m-d`. Branded,
 * so `toApiDate` is the only way to get one and the wire format is a
 * compile-time property. Anything else is a 422, not a coercion. */
export type ApiDate = string & { readonly __brand: "ApiDate" };

// A date-only value, as distinct from a full timestamp. The same regex and
// local-components rule live in `utils/date-time.ts`, which renders a
// timestamp rather than branding one for the wire. Change one, look at the
// other.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Leading date part of an ISO-8601 timestamp.
const ISO_DATE_PART = /^(\d{4}-\d{2}-\d{2})T/;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The only place that knows the API's wire format for a date.
 *
 * A `Date` is a picker value, so its **local** components are taken:
 * `toISOString()` would turn an Aug 24 pick into Aug 23 in UTC+8. A
 * `string` is already in the API's UTC calendar, so its date part is
 * truncated rather than reparsed. `null` for anything unusable, so a bad
 * value drops the filter instead of sending a 422.
 */
export function toApiDate(value: Date | string | null | undefined): ApiDate | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    if (DATE_ONLY.test(value)) return brandIfReal(value);

    const isoDatePart = ISO_DATE_PART.exec(value);
    if (isoDatePart) return brandIfReal(isoDatePart[1]);

    // Not a shape the API sends. Parse as a last resort, then fall through
    // to the same local-components rule a picker value gets.
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return fromLocalComponents(parsed);
  }

  if (Number.isNaN(value.getTime())) return null;
  return fromLocalComponents(value);
}

// `2026-13-45` and `2026-02-30` match the shape without being dates, so the
// shape check is followed by building the date and checking it didn't roll
// over into another month.
function brandIfReal(value: string): ApiDate | null {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const isReal =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isReal ? (value as ApiDate) : null;
}

function fromLocalComponents(date: Date): ApiDate {
  const formatted = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
  return formatted as ApiDate;
}
