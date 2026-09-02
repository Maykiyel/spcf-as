// Matches a date-only value ("2026-08-24") as distinct from a full
// timestamp ("2026-08-24T06:30:00.000000Z").
//
// The backend sends the latter: TransactionResource maps `date` to the
// model's `created_at` (see BACKEND_NOTES.md), so it is always a full
// ISO-8601 timestamp and this branch does not fire in production. It is
// kept because TransactionDTO.date is typed as a bare string, and a
// date-only value parsed as an instant is silently wrong rather than
// loudly wrong — `new Date("2026-08-24")` is UTC midnight, which renders
// as a fabricated clock time locally and rolls back a day west of UTC.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Date and time are formatted separately and joined here rather than asked
// for in one Intl call. A single formatter with both date and time fields
// inserts a locale connector that varies by ICU version ("Aug 24, 2026 at
// 2:30 PM" on newer data, "Aug 24, 2026, 2:30 PM" on older), which would
// make the printed receipt change appearance with the browser rather than
// with our code.
const ACKNOWLEDGEMENT_RECEIPT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const ACKNOWLEDGEMENT_RECEIPT_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

// A date-only string is a calendar date, not an instant. Passing one to
// `new Date()` parses it as UTC midnight, which then renders in local time
// as a fabricated clock reading — and rolls back a day anywhere west of
// UTC. Splitting the parts and building a local date keeps the calendar
// date the backend sent, in every timezone.
function parseTransactionDate(
  date: string,
): { value: Date; hasTime: boolean } | null {
  if (DATE_ONLY.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return { value: new Date(year, month - 1, day), hasTime: false };
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return { value: parsed, hasTime: true };
}

// Renders the date an Acknowledgement Receipt prints. The backend sends a
// real timestamp, so the receipt shows the time of the transaction as well
// as the day.
//
// The date-only guard case prints the day alone: there is no time to show,
// and midnight would be a clock reading nobody recorded — worse on a
// printed receipt than simply omitting it.
export function formatTransactionDate(date: string | undefined): string {
  if (!date) return "—";

  const parsed = parseTransactionDate(date);
  if (!parsed) return "—";

  const day = ACKNOWLEDGEMENT_RECEIPT_DATE_FORMAT.format(parsed.value);
  if (!parsed.hasTime) return day;

  return `${day}, ${ACKNOWLEDGEMENT_RECEIPT_TIME_FORMAT.format(parsed.value)}`;
}
