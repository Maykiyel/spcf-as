// Matches a date-only value ("2026-08-24") as distinct from a full
// timestamp ("2026-08-24T14:30:00Z"). TransactionDTO.date is typed as a
// bare string and the backend's exact shape isn't pinned down anywhere in
// this repo, so both have to render correctly.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const RECEIPT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
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
// date-only: the receipt records which day a payment was made, and a time
// of day would be invented outright for the date-only case.
export function formatTransactionDate(date: string | undefined): string {
  if (!date) return "—";

  const parsed = parseTransactionDate(date);
  return parsed ? RECEIPT_DATE_FORMAT.format(parsed) : "—";
}
