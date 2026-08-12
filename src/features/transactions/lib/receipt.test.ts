import { describe, it, expect } from "vitest";
import {
  toLineItem,
  calculateLineSubtotal,
  calculateTotal,
  addOrIncrementLineItem,
  setLineItemQuantity,
  canConfirmTransaction,
  getMissingRequirements,
} from "./receipt";
import type { FeeCatalogItem, ReceiptLineItem } from "../types";

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

describe("toLineItem", () => {
  it("builds a receipt line item with a quantity of 1 by default", () => {
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
    const lineItem: ReceiptLineItem = {
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
  it("is zero for an empty receipt", () => {
    expect(calculateTotal([])).toBe(0);
  });

  it("sums each line's subtotal, not just its unit price", () => {
    const lineItems: ReceiptLineItem[] = [
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
  it("appends a new line item with quantity 1 when the fee isn't in the receipt yet", () => {
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
    const existing: ReceiptLineItem[] = [
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
    const existing: ReceiptLineItem[] = [
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
    const existing: ReceiptLineItem[] = [
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

describe("setLineItemQuantity", () => {
  const lineItems: ReceiptLineItem[] = [
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

describe("canConfirmTransaction", () => {
  it("false when the payer name is blank", () => {
    expect(
      canConfirmTransaction({
        payerName: "  ",
        lineItems: [
          { id: "a", feeItemId: 1, name: "x", price: 100, quantity: 1 },
        ],
      }),
    ).toBe(false);
  });

  it("false when there are no line items", () => {
    expect(
      canConfirmTransaction({ payerName: "Juan Dela Cruz", lineItems: [] }),
    ).toBe(false);
  });

  it("true when there's a payer name and at least one line item", () => {
    expect(
      canConfirmTransaction({
        payerName: "Juan Dela Cruz",
        lineItems: [
          { id: "a", feeItemId: 1, name: "x", price: 100, quantity: 1 },
        ],
      }),
    ).toBe(true);
  });
});

describe("getMissingRequirements", () => {
  it("returns both requirements when name is empty and receipt has no line items", () => {
    expect(
      getMissingRequirements({
        payerName: "   ",
        lineItems: [],
      }),
    ).toEqual(["Payer Name", "At least 1 item"]);
  });

  it("returns missing payer name when line items exist but name is empty", () => {
    expect(
      getMissingRequirements({
        payerName: "",
        lineItems: [
          { id: "a", feeItemId: 1, name: "x", price: 100, quantity: 1 },
        ],
      }),
    ).toEqual(["Payer Name"]);
  });

  it("returns missing line items when payer name exists but receipt is empty", () => {
    expect(
      getMissingRequirements({
        payerName: "Juan Dela Cruz",
        lineItems: [],
      }),
    ).toEqual(["At least 1 item"]);
  });

  it("returns an empty array when both payer name and line items are present", () => {
    expect(
      getMissingRequirements({
        payerName: "Juan Dela Cruz",
        lineItems: [
          { id: "a", feeItemId: 1, name: "x", price: 100, quantity: 1 },
        ],
      }),
    ).toEqual([]);
  });
});
