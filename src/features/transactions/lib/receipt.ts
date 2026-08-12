import type { FeeCatalogItem, ReceiptLineItem } from "../types";

const MIN_QUANTITY = 1;

export function toLineItem(
  feeItem: FeeCatalogItem,
  id: string,
  quantity: number = MIN_QUANTITY,
): ReceiptLineItem {
  return {
    id,
    feeItemId: feeItem.id,
    name: feeItem.name,
    price: feeItem.price,
    quantity,
  };
}

export function calculateLineSubtotal(lineItem: ReceiptLineItem): number {
  return lineItem.price * lineItem.quantity;
}

export function calculateTotal(lineItems: ReceiptLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + calculateLineSubtotal(item), 0);
}

// Cashiers frequently tap "Add" more than once for the same fee (e.g. two
// swimming day passes). Rather than creating duplicate rows, bump the
// existing line's quantity — one row per distinct fee.
export function addOrIncrementLineItem(
  lineItems: ReceiptLineItem[],
  feeItem: FeeCatalogItem,
  newLineItemId: string,
): ReceiptLineItem[] {
  const existing = lineItems.find((item) => item.feeItemId === feeItem.id);

  if (!existing) {
    return [...lineItems, toLineItem(feeItem, newLineItemId)];
  }

  return lineItems.map((item) =>
    item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item,
  );
}

export function setLineItemQuantity(
  lineItems: ReceiptLineItem[],
  lineItemId: string,
  quantity: number,
): ReceiptLineItem[] {
  const clamped = Math.max(MIN_QUANTITY, quantity);

  return lineItems.map((item) =>
    item.id === lineItemId ? { ...item, quantity: clamped } : item,
  );
}

type ConfirmCheck = {
  payerName: string;
  lineItems: ReceiptLineItem[];
};

export function canConfirmTransaction({
  payerName,
  lineItems,
}: ConfirmCheck): boolean {
  return payerName.trim().length > 0 && lineItems.length > 0;
}

export function getMissingRequirements({
  payerName,
  lineItems,
}: ConfirmCheck): string[] {
  const missing: string[] = [];
  if (!payerName.trim()) missing.push("Payer Name");
  if (lineItems.length === 0) missing.push("At least 1 item");
  return missing;
}