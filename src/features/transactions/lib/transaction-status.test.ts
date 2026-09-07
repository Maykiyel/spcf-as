import { describe, it, expect } from "vitest";
import {
  isPrintable,
  printRefusalReason,
  TRANSACTION_STATUS_LABEL,
} from "./transaction-status";
import { TRANSACTION_STATUSES } from "../types";

// Seam: the pure pair both pages import. Exhaustive over all five statuses
// on purpose — the point of one shared predicate and one total label map is
// that the two pages cannot drift, and the point of asserting every status
// is that a sixth one added to the union arrives here rather than as a
// blank badge on screen.

describe("isPrintable", () => {
  it("allows only a completed transaction", () => {
    expect(isPrintable("completed")).toBe(true);
  });

  it.each(["pending", "abandoned", "cancelled", "returned"] as const)(
    "refuses a %s transaction",
    (status) => {
      expect(isPrintable(status)).toBe(false);
    },
  );

  it("refuses every status but completed, whatever the union grows to", () => {
    const printable = TRANSACTION_STATUSES.filter(isPrintable);

    expect(printable).toEqual(["completed"]);
  });
});

describe("TRANSACTION_STATUS_LABEL", () => {
  it("calls a returned transaction Voided, not Returned", () => {
    // The admin action is called Void. "Returned" is the wire's word and
    // means nothing to a cashier.
    expect(TRANSACTION_STATUS_LABEL.returned).toBe("Voided");
  });

  it("title-cases the other four", () => {
    expect(TRANSACTION_STATUS_LABEL.pending).toBe("Pending");
    expect(TRANSACTION_STATUS_LABEL.abandoned).toBe("Abandoned");
    expect(TRANSACTION_STATUS_LABEL.completed).toBe("Completed");
    expect(TRANSACTION_STATUS_LABEL.cancelled).toBe("Cancelled");
  });

  it("labels every status in the union", () => {
    for (const status of TRANSACTION_STATUSES) {
      expect(TRANSACTION_STATUS_LABEL[status]).toBeTruthy();
    }
  });

  it("says nothing that would tell abandoned and cancelled apart", () => {
    // Neither the app nor the spec distinguishes them for a cashier, so
    // neither label invents a distinction.
    expect(TRANSACTION_STATUS_LABEL.abandoned).not.toContain("cancel");
    expect(TRANSACTION_STATUS_LABEL.cancelled).not.toContain("abandon");
  });
});

describe("printRefusalReason", () => {
  it("names the status in the words the app already uses", () => {
    expect(printRefusalReason("returned")).toContain("voided");
    expect(printRefusalReason("pending")).toContain("pending");
  });

  it("says what the rule is, not just that it was refused", () => {
    expect(printRefusalReason("returned")).toContain("completed transaction");
  });
});
