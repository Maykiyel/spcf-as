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

const ACKNOWLEDGEMENT_RECEIPT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// A date-only string is a calendar date, not an instant. Passing one to
// `new Date()` parses it as UTC midnight, which then renders in local time
// as a fabricated clock reading — and rolls back a day anywhere west of
// UTC. Splitting the parts and building a local date keeps the calendar
// date the backend sent, in every timezone.
function parseTransactionDate(date: string): Date | null {
  if (DATE_ONLY.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Renders the date an Acknowledgement Receipt prints. Deliberately
// date-only: an Acknowledgement Receipt records which day a payment was
// made, and a time of day would be invented outright for date-only input.
export function formatTransactionDate(date: string | undefined): string {
  if (!date) return "—";

  const parsed = parseTransactionDate(date);
  return parsed ? ACKNOWLEDGEMENT_RECEIPT_DATE_FORMAT.format(parsed) : "—";
}
