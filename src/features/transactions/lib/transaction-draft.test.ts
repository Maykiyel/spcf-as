import { describe, it, expect } from "vitest";
import {
  isLineItemLocked,
  isPendingLineItem,
  toLineItem,
  calculateLineSubtotal,
  calculateTotal,
  calculateChange,
  addOrIncrementLineItem,
  revertOptimisticIncrement,
  upsertLineItemFromDTO,
  setLineItemQuantity,
  draftReadiness,
} from "./transaction-draft";
import type { FeeCatalogItem, DraftLineItem } from "../types";

const gradFee: FeeCatalogItem = {
  id: 1,
  name: "Graduation Fee - College",
  description: null,
  price: 1500,
  itemCode: "GRAD",
};

const parkingFee: FeeCatalogItem = {
  id: 2,
  name: "Parking Sticker",
  description: null,
  price: 200,
  itemCode: "PARKING",
};

describe("isLineItemLocked", () => {
  const settledItem: DraftLineItem = {
    id: "501",
    feeItemId: 2,
    name: "Parking Sticker",
    price: 200,
    quantity: 1,
  };

  it("is locked while still on its optimistic client-only id, regardless of pendingFeeItemIds", () => {
    const optimisticItem: DraftLineItem = {
      ...settledItem,
      id: "optimistic-2",
    };
    expect(isLineItemLocked(optimisticItem, new Set())).toBe(true);
  });

  it("is locked when the fee has outstanding add activity, even with a real backend id", () => {
    // The exact bug this closes: addOrIncrementLineItem keeps the
    // existing real id when bumping an already-settled item's quantity,
    // so isPendingLineItem alone can't see a repeat-add's still-pending
    // batched increment — pendingFeeItemIds is what catches it.
    expect(isLineItemLocked(settledItem, new Set([2]))).toBe(true);
  });

  it("is unlocked once settled with no outstanding add activity for that fee", () => {
    expect(isLineItemLocked(settledItem, new Set())).toBe(false);
  });

  it("only locks the matching fee — an unrelated fee's pending add doesn't lock this line", () => {
    expect(isLineItemLocked(settledItem, new Set([999]))).toBe(false);
  });
});

describe("isPendingLineItem", () => {
  it("is true for a line item still on its optimistic client-only id", () => {
    expect(
      isPendingLineItem({
        id: "optimistic-2",
        feeItemId: 2,
        name: "Parking Sticker",
        price: 200,
        quantity: 1,
      }),
    ).toBe(true);
  });

  it("is false once the line item carries a real backend id", () => {
    expect(
      isPendingLineItem({
        id: "501",
        feeItemId: 2,
        name: "Parking Sticker",
        price: 200,
        quantity: 1,
      }),
    ).toBe(false);
  });
});

describe("toLineItem", () => {
  it("builds a draft line item with a quantity of 1 by default", () => {
    expect(toLineItem(gradFee, "line-1")).toEqual({
      id: "line-1",
      feeItemId: 1,
      name: "Graduation Fee - College",
      price: 1500,
      quantity: 1,
    });
  });

  it("accepts an explicit quantity", () => {
    expect(toLineItem(gradFee, "line-1", 3).quantity).toBe(3);
  });
});

describe("calculateLineSubtotal", () => {
  it("multiplies price by quantity", () => {
    const lineItem: DraftLineItem = {
      id: "a",
      feeItemId: 1,
      name: "Graduation Fee - College",
      price: 1500,
      quantity: 2,
    };
    expect(calculateLineSubtotal(lineItem)).toBe(3000);
  });
});

describe("calculateTotal", () => {
  it("is zero for an empty draft", () => {
    expect(calculateTotal([])).toBe(0);
  });

  it("sums each line's subtotal, not just its unit price", () => {
    const lineItems: DraftLineItem[] = [
      {
        id: "a",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
      {
        id: "b",
        feeItemId: 2,
        name: "Parking Sticker",
        price: 200,
        quantity: 3,
      },
    ];
    expect(calculateTotal(lineItems)).toBe(2100);
  });
});

describe("addOrIncrementLineItem", () => {
  it("appends a new line item with quantity 1 when the fee isn't in the draft yet", () => {
    const result = addOrIncrementLineItem([], gradFee, "line-1");
    expect(result).toEqual([
      {
        id: "line-1",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
    ]);
  });

  it("increments the existing line's quantity instead of duplicating it", () => {
    const existing: DraftLineItem[] = [
      {
        id: "line-1",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
    ];
    const result = addOrIncrementLineItem(existing, gradFee, "line-2");
    expect(result).toEqual([
      {
        id: "line-1",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 2,
      },
    ]);
  });

  it("only increments the matching line, leaving others untouched", () => {
    const existing: DraftLineItem[] = [
      {
        id: "line-1",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
      {
        id: "line-2",
        feeItemId: 2,
        name: "Parking Sticker",
        price: 200,
        quantity: 1,
      },
    ];
    const result = addOrIncrementLineItem(existing, parkingFee, "line-3");
    expect(result).toEqual([
      {
        id: "line-1",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
      {
        id: "line-2",
        feeItemId: 2,
        name: "Parking Sticker",
        price: 200,
        quantity: 2,
      },
    ]);
  });

  it("does not mutate the input array", () => {
    const existing: DraftLineItem[] = [
      {
        id: "line-1",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
    ];
    const copy = existing.map((item) => ({ ...item }));
    addOrIncrementLineItem(existing, gradFee, "line-2");
    expect(existing).toEqual(copy);
  });
});

describe("revertOptimisticIncrement", () => {
  it("removes the line entirely when it was down to quantity 1", () => {
    const lineItems: DraftLineItem[] = [
      {
        id: "optimistic-1",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
    ];
    expect(revertOptimisticIncrement(lineItems, 1)).toEqual([]);
  });

  it("decrements quantity by 1 rather than removing when more than one remains", () => {
    const lineItems: DraftLineItem[] = [
      {
        id: "501",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 3,
      },
    ];
    expect(revertOptimisticIncrement(lineItems, 1)).toEqual([
      {
        id: "501",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 2,
      },
    ]);
  });

  it("is a no-op when the fee isn't in the draft", () => {
    const lineItems: DraftLineItem[] = [
      {
        id: "501",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
    ];
    expect(revertOptimisticIncrement(lineItems, 999)).toBe(lineItems);
  });

  it("only touches the matching line, leaving others untouched", () => {
    const lineItems: DraftLineItem[] = [
      {
        id: "501",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 2,
      },
      {
        id: "502",
        feeItemId: 2,
        name: "Parking Sticker",
        price: 200,
        quantity: 1,
      },
    ];
    expect(revertOptimisticIncrement(lineItems, 1)).toEqual([
      {
        id: "501",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
      {
        id: "502",
        feeItemId: 2,
        name: "Parking Sticker",
        price: 200,
        quantity: 1,
      },
    ]);
  });

  it("is the exact inverse of addOrIncrementLineItem for a fresh add", () => {
    const afterAdd = addOrIncrementLineItem([], gradFee, "optimistic-1");
    expect(revertOptimisticIncrement(afterAdd, gradFee.id)).toEqual([]);
  });

  it("is the exact inverse of addOrIncrementLineItem for a repeat add", () => {
    const afterFirstAdd = addOrIncrementLineItem([], gradFee, "optimistic-1");
    const afterSecondAdd = addOrIncrementLineItem(
      afterFirstAdd,
      gradFee,
      "optimistic-1",
    );
    expect(revertOptimisticIncrement(afterSecondAdd, gradFee.id)).toEqual(
      afterFirstAdd,
    );
  });

  it("reverts a whole coalesced batch at once when given an amount", () => {
    // A burst of 5 rapid clicks now sends one batched request for
    // quantity 5 instead of 5 separate requests — if that single request
    // fails, the whole batch needs to be rolled back in one call, not
    // five separate single-unit reverts.
    const lineItems: DraftLineItem[] = [
      {
        id: "optimistic-1",
        feeItemId: 1,
        name: "Parking Sticker",
        price: 200,
        quantity: 5,
      },
    ];
    expect(revertOptimisticIncrement(lineItems, 1, 5)).toEqual([]);
  });

  it("reverting a batch leaves a positive remainder when quantity exceeds the batch amount", () => {
    const lineItems: DraftLineItem[] = [
      {
        id: "501",
        feeItemId: 1,
        name: "Parking Sticker",
        price: 200,
        quantity: 7,
      },
    ];
    expect(revertOptimisticIncrement(lineItems, 1, 5)).toEqual([
      {
        id: "501",
        feeItemId: 1,
        name: "Parking Sticker",
        price: 200,
        quantity: 2,
      },
    ]);
  });
});

describe("upsertLineItemFromDTO", () => {
  it("appends a new line item keyed by the backend item id when the fee isn't in the draft yet", () => {
    const result = upsertLineItemFromDTO([], 1, {
      id: 501,
      name: "Graduation Fee - College",
      price: 1500,
      quantity: 1,
    });
    expect(result).toEqual([
      {
        id: "501",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
    ]);
  });

  it("replaces the matching line item's quantity rather than duplicating it", () => {
    const existing: DraftLineItem[] = [
      {
        id: "501",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
    ];
    const result = upsertLineItemFromDTO(existing, 1, {
      id: 501,
      name: "Graduation Fee - College",
      price: 1500,
      quantity: 2,
    });
    expect(result).toEqual([
      {
        id: "501",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 2,
      },
    ]);
  });

  it("only updates the matching line, leaving others untouched", () => {
    const existing: DraftLineItem[] = [
      {
        id: "501",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
      {
        id: "502",
        feeItemId: 2,
        name: "Parking Sticker",
        price: 200,
        quantity: 1,
      },
    ];
    const result = upsertLineItemFromDTO(existing, 2, {
      id: 502,
      name: "Parking Sticker",
      price: 200,
      quantity: 2,
    });
    expect(result).toEqual([
      {
        id: "501",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
      {
        id: "502",
        feeItemId: 2,
        name: "Parking Sticker",
        price: 200,
        quantity: 2,
      },
    ]);
  });

  it("does not mutate the input array", () => {
    const existing: DraftLineItem[] = [
      {
        id: "501",
        feeItemId: 1,
        name: "Graduation Fee - College",
        price: 1500,
        quantity: 1,
      },
    ];
    const copy = existing.map((item) => ({ ...item }));
    upsertLineItemFromDTO(existing, 1, {
      id: 501,
      name: "Graduation Fee - College",
      price: 1500,
      quantity: 2,
    });
    expect(existing).toEqual(copy);
  });
});

describe("setLineItemQuantity", () => {
  const lineItems: DraftLineItem[] = [
    {
      id: "line-1",
      feeItemId: 1,
      name: "Graduation Fee - College",
      price: 1500,
      quantity: 2,
    },
    {
      id: "line-2",
      feeItemId: 2,
      name: "Parking Sticker",
      price: 200,
      quantity: 1,
    },
  ];

  it("sets the quantity of the matching line item", () => {
    const result = setLineItemQuantity(lineItems, "line-1", 5);
    expect(result.find((item) => item.id === "line-1")?.quantity).toBe(5);
  });

  it("leaves other line items untouched", () => {
    const result = setLineItemQuantity(lineItems, "line-1", 5);
    expect(result.find((item) => item.id === "line-2")?.quantity).toBe(1);
  });

  it("clamps quantity to a minimum of 1", () => {
    const result = setLineItemQuantity(lineItems, "line-1", 0);
    expect(result.find((item) => item.id === "line-1")?.quantity).toBe(1);
  });

  it("clamps negative quantities to 1", () => {
    const result = setLineItemQuantity(lineItems, "line-1", -3);
    expect(result.find((item) => item.id === "line-1")?.quantity).toBe(1);
  });

  it("does not mutate the input array", () => {
    const copy = lineItems.map((item) => ({ ...item }));
    setLineItemQuantity(lineItems, "line-1", 9);
    expect(lineItems).toEqual(copy);
  });
});

describe("calculateChange", () => {
  const lineItems: DraftLineItem[] = [
    { id: "a", feeItemId: 1, name: "x", price: 100, quantity: 2 },
  ];

  it("is amountPaid minus the total", () => {
    expect(calculateChange(lineItems, 250)).toBe(50);
  });

  it("is zero when amountPaid exactly covers the total", () => {
    expect(calculateChange(lineItems, 200)).toBe(0);
  });

  it("clamps to zero rather than going negative", () => {
    expect(calculateChange(lineItems, 100)).toBe(0);
  });
});

describe("draftReadiness", () => {
  const item = (price: number, quantity = 1): DraftLineItem => ({
    id: "a",
    feeItemId: 1,
    name: "x",
    price,
    quantity,
  });

  const CASES: {
    name: string;
    input: Parameters<typeof draftReadiness>[0];
    ready: boolean;
    reasons: string[];
  }[] = [
    {
      name: "blank payer name, otherwise complete",
      input: {
        payerName: "  ",
        lineItems: [item(100)],
        amountPaid: 100,
        isSyncing: false,
      },
      ready: false,
      reasons: ["Payer Name"],
    },
    {
      name: "empty payer name, otherwise complete",
      input: {
        payerName: "",
        lineItems: [item(100)],
        amountPaid: 100,
        isSyncing: false,
      },
      ready: false,
      reasons: ["Payer Name"],
    },
    {
      name: "no name and no items",
      input: {
        payerName: "   ",
        lineItems: [],
        amountPaid: 0,
        isSyncing: false,
      },
      ready: false,
      reasons: ["Payer Name", "At least 1 item"],
    },
    {
      name: "name present, draft empty",
      input: {
        payerName: "Juan Dela Cruz",
        lineItems: [],
        amountPaid: 0,
        isSyncing: false,
      },
      ready: false,
      reasons: ["At least 1 item"],
    },
    {
      // The guard: an empty draft must not also say "must cover ₱0", which
      // reads as a second thing to fix when there is only one.
      name: "empty draft never flags the amount against a zero total",
      input: {
        payerName: "",
        lineItems: [],
        amountPaid: 0,
        isSyncing: false,
      },
      ready: false,
      reasons: ["Payer Name", "At least 1 item"],
    },
    {
      name: "amount paid short of the total",
      input: {
        payerName: "Juan Dela Cruz",
        lineItems: [item(100)],
        amountPaid: 50,
        isSyncing: false,
      },
      ready: false,
      reasons: ["Amount Paid (must cover total)"],
    },
    {
      name: "name, an item, and exactly enough paid",
      input: {
        payerName: "Juan Dela Cruz",
        lineItems: [item(100)],
        amountPaid: 100,
        isSyncing: false,
      },
      ready: true,
      reasons: [],
    },
    {
      name: "amount paid exceeds the total, change owed",
      input: {
        payerName: "Juan Dela Cruz",
        lineItems: [item(100)],
        amountPaid: 500,
        isSyncing: false,
      },
      ready: true,
      reasons: [],
    },
    {
      // Reproduces the reported bug: 128.02 x 3 + 615.94 sums to
      // 1000.0000000000001137 in raw JS floats (verified), even though it
      // displays as a clean ₱1,000.00 total, and the cashier typed exactly
      // 1000 as Amount Paid.
      name: "a summed total drifting a hair above the round amount typed",
      input: {
        payerName: "Juan Dela Cruz",
        lineItems: [
          { id: "a", feeItemId: 1, name: "x", price: 128.02, quantity: 3 },
          { id: "b", feeItemId: 2, name: "y", price: 615.94, quantity: 1 },
        ],
        amountPaid: 1000,
        isSyncing: false,
      },
      ready: true,
      reasons: [],
    },
    {
      name: "syncing blocks an otherwise complete draft",
      input: {
        payerName: "Juan Dela Cruz",
        lineItems: [item(100)],
        amountPaid: 100,
        isSyncing: true,
      },
      ready: false,
      reasons: ["Still syncing — please wait a moment"],
    },
    {
      // Order is user-visible copy, and syncing is the transient one, so it
      // sits behind the requirements the cashier can actually act on.
      name: "the syncing reason comes last",
      input: {
        payerName: "",
        lineItems: [],
        amountPaid: 0,
        isSyncing: true,
      },
      ready: false,
      reasons: [
        "Payer Name",
        "At least 1 item",
        "Still syncing — please wait a moment",
      ],
    },
  ];

  it.each(CASES)("$name", ({ input, ready, reasons }) => {
    expect(draftReadiness(input)).toEqual({ ready, reasons });
  });

  // The defect this function exists to remove: a Confirm button enabled
  // while the list beside it says why it should not be.
  it.each(CASES)("$name — the verdict agrees with the reasons", ({ input }) => {
    const { ready, reasons } = draftReadiness(input);
    expect(ready).toBe(reasons.length === 0);
  });
});
