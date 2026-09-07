// A date-only value, as distinct from a full timestamp. The backend only
// sends timestamps, so this branch is defensive: `date` is typed as a bare
// string, and a date-only value parsed as an instant is silently wrong.
//
// `components/ui/date-range/api-date.ts` carries the same regex and rule;
// the tiers can't share it. Change one, look at the other.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Formatted separately and joined, not asked for in one Intl call: a
// combined formatter's connector varies by ICU version ("at 2:30 PM" vs
// ", 2:30 PM"), which would change the printed receipt with the browser.
const TRANSACTION_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const TRANSACTION_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

// A calendar date, not an instant: `new Date("2026-08-24")` is UTC
// midnight, which renders as a fabricated clock time and rolls back a day
// west of UTC. Building it from parts keeps the date in every timezone.
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

// Renders a transaction's date wherever one is shown: on the printed
// Acknowledgement Receipt, and in the receipts list. The backend sends a
// real timestamp, so both show the time of the transaction as well as the
// day, and they show it identically because they ask the same function.
//
// The date-only guard case shows the day alone: there is no time to show,
// and midnight would be a clock reading nobody recorded — worse on a
// printed receipt than simply omitting it.
export function formatTransactionDate(date: string | undefined): string {
  if (!date) return "—";

  const parsed = parseTransactionDate(date);
  if (!parsed) return "—";

  const day = TRANSACTION_DATE_FORMAT.format(parsed.value);
  if (!parsed.hasTime) return day;

  return `${day}, ${TRANSACTION_TIME_FORMAT.format(parsed.value)}`;
}
