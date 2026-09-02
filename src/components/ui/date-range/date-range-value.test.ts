import { describe, it, expect } from "vitest";
import { nextDateRange, EMPTY_DATE_RANGE } from "./date-range-value";

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
