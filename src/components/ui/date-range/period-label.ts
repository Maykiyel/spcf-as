import { toApiDate } from "./api-date";

// Formatted through Intl rather than assembled by hand, and split into
// three formatters because the year's placement differs per case.
const MONTH_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const MONTH_DAY_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type Parts = { year: number; month: number; day: number; date: Date };

/** Validated through `toApiDate`, so "is this a date the API could have
 * sent" is answered in one place rather than by a second regex here. */
function parts(value: string | null): Parts | null {
  const apiDate = toApiDate(value);
  if (!apiDate) return null;

  const [year, month, day] = apiDate.split("-").map(Number);
  return { year, month, day, date: new Date(year, month - 1, day) };
}

// Day zero of the next month is the last day of this one.
const lastDay = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

/**
 * What a table's date range reads as, in words. `null` where no honest
 * line exists: half a range is not something the control can publish, and
 * the table sends nothing and shows nothing in that state.
 */
export function periodLabel(
  from: string | null,
  to: string | null,
): string | null {
  if (!from && !to) return "Showing all dates";

  const start = parts(from);
  const end = parts(to);
  if (!start || !end) return null;

  const wholeMonth =
    start.year === end.year &&
    start.month === end.month &&
    start.day === 1 &&
    end.day === lastDay(end.year, end.month);

  if (wholeMonth) return `Showing ${MONTH_YEAR.format(start.date)}`;

  // The year is stated once where both ends share it, and on both ends
  // where they do not.
  const startText =
    start.year === end.year
      ? MONTH_DAY.format(start.date)
      : MONTH_DAY_YEAR.format(start.date);

  return `Showing ${startText} – ${MONTH_DAY_YEAR.format(end.date)}`;
}
