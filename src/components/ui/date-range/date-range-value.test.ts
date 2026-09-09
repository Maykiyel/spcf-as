import { describe, it, expect } from "vitest";
import {
  nextDateRange,
  EMPTY_DATE_RANGE,
  currentMonthRange,
} from "./date-range-value";

describe("nextDateRange", () => {
  it("publishes a complete range", () => {
    expect(nextDateRange(["2026-08-01", "2026-08-31"])).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("holds when only the start is selected", () => {
    // Mid-interaction. Publishing here would fire a request the API answers
    // with a 422, because `to_date` carries `after_or_equal:from_date`.
    expect(nextDateRange(["2026-08-01", null])).toBeNull();
  });

  it("holds when only the end is selected", () => {
    expect(nextDateRange([null, "2026-08-31"])).toBeNull();
  });

  it("publishes the empty range when both ends are cleared", () => {
    // Not a hold — clearing is how a user gets back to the unfiltered view,
    // so it has to reach the consumer.
    expect(nextDateRange([null, null])).toEqual(EMPTY_DATE_RANGE);
  });

  it("converts picked Dates to the wire format", () => {
    const range: [Date, Date] = [new Date(2026, 7, 1), new Date(2026, 7, 31)];
    expect(nextDateRange(range)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("treats an unparseable end as unselected rather than publishing it", () => {
    expect(nextDateRange(["2026-08-01", "not-a-date"])).toBeNull();
  });
});

describe("currentMonthRange", () => {
  it("spans the first to the last day of the month it is given", () => {
    expect(currentMonthRange(new Date(2026, 8, 9))).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("ends on the 31st in a 31-day month", () => {
    expect(currentMonthRange(new Date(2026, 7, 24))).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("ends on the 29th in a leap February", () => {
    // Day zero of March, not a hard-coded 28.
    expect(currentMonthRange(new Date(2028, 1, 14))).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
  });

  it("stays inside December rather than rolling into the new year", () => {
    expect(currentMonthRange(new Date(2026, 11, 31))).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });

  it("reads the day's local components, not its UTC ones", () => {
    // Local midnight on the 1st is the previous month in UTC east of it. A
    // UTC-derived range would report August for this date in UTC+8.
    expect(currentMonthRange(new Date(2026, 8, 1, 0, 30))).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });
});
