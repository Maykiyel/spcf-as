import { roundToCents } from "@/utils/currency";
import type { FeeCatalogItem, DraftLineItem } from "../types";

const MIN_QUANTITY = 1;

// True until the add response reconciles this line to a real backend id
// (via upsertLineItemFromDTO). Guards against sending Number("optimistic-2")
// to the API.
export function isPendingLineItem(lineItem: DraftLineItem): boolean {
  return lineItem.id.startsWith("optimistic-");
}

// Whether a row's controls should be disabled. isPendingLineItem alone
// misses repeat adds: a line can already have a real id while its latest
// increment is still debouncing/in-flight — pendingFeeItemIds catches that.
export function isLineItemLocked(
  lineItem: DraftLineItem,
  pendingFeeItemIds: ReadonlySet<number>,
): boolean {
  return (
    isPendingLineItem(lineItem) || pendingFeeItemIds.has(lineItem.feeItemId)
  );
}

export function toLineItem(
  feeItem: FeeCatalogItem,
  id: string,
  quantity: number = MIN_QUANTITY,
): DraftLineItem {
  return {
    id,
    feeItemId: feeItem.id,
    name: feeItem.name,
    price: feeItem.price,
    quantity,
  };
}

export function calculateLineSubtotal(lineItem: DraftLineItem): number {
  return lineItem.price * lineItem.quantity;
}

export function calculateTotal(lineItems: DraftLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + calculateLineSubtotal(item), 0);
}

// Repeat "Add" clicks on the same fee bump quantity instead of creating a
// duplicate row. Also the optimistic-add step: applied immediately on
// click, reconciled later by upsertLineItemFromDTO, undone on failure by
// revertOptimisticIncrement.
export function addOrIncrementLineItem(
  lineItems: DraftLineItem[],
  feeItem: FeeCatalogItem,
  newLineItemId: string,
): DraftLineItem[] {
  const existing = lineItems.find((item) => item.feeItemId === feeItem.id);

  if (!existing) {
    return [...lineItems, toLineItem(feeItem, newLineItemId)];
  }

  return lineItems.map((item) =>
    item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item,
  );
}

// Inverse of addOrIncrementLineItem, for a failed optimistic add. Undoes
// by exact operation rather than restoring a full pre-click snapshot,
// which would also wipe out other changes that succeeded meanwhile.
export function revertOptimisticIncrement(
  lineItems: DraftLineItem[],
  feeItemId: number,
  amount = 1,
): DraftLineItem[] {
  const existing = lineItems.find((item) => item.feeItemId === feeItemId);
  if (!existing) return lineItems;

  const remaining = existing.quantity - amount;
  if (remaining <= 0) {
    return lineItems.filter((item) => item.feeItemId !== feeItemId);
  }

  return lineItems.map((item) =>
    item.feeItemId === feeItemId ? { ...item, quantity: remaining } : item,
  );
}

// Reconciles a line against what POST /transactions/:id/items actually
// persisted, matched by feeItemId (the endpoint upserts by service, so a
// repeat add always resolves to the same backend item). Replaces the
// client-guessed id/quantity with the server's real values.
//
// `keepClientQuantity` holds the draft's own count when clicks are still
// queued behind this response: the server answered the batch it was sent,
// not the ones that landed after. See #118.
export function upsertLineItemFromDTO(
  lineItems: DraftLineItem[],
  feeItemId: number,
  item: { id: number; name: string; price: number; quantity: number },
  { keepClientQuantity = false } = {},
): DraftLineItem[] {
  const existingIndex = lineItems.findIndex(
    (existing) => existing.feeItemId === feeItemId,
  );
  const existing = lineItems[existingIndex];

  const nextLineItem: DraftLineItem = {
    id: String(item.id),
    feeItemId,
    name: item.name,
    price: item.price,
    // No existing row means nothing was guessed, so there is nothing to keep.
    quantity:
      keepClientQuantity && existing ? existing.quantity : item.quantity,
  };

  if (existingIndex === -1) {
    return [...lineItems, nextLineItem];
  }

  return lineItems.map((line, index) =>
    index === existingIndex ? nextLineItem : line,
  );
}

export function setLineItemQuantity(
  lineItems: DraftLineItem[],
  lineItemId: string,
  quantity: number,
): DraftLineItem[] {
  const clamped = Math.max(MIN_QUANTITY, quantity);

  return lineItems.map((item) =>
    item.id === lineItemId ? { ...item, quantity: clamped } : item,
  );
}

// Change is never negative in the UI — an insufficient amount tendered is
// caught by `draftReadiness` and blocks Confirm before this would ever
// matter, but clamping keeps the displayed figure sane while the cashier is
// still mid-typing an amount.
export function calculateChange(
  lineItems: DraftLineItem[],
  amountPaid: number,
): number {
  return Math.max(0, roundToCents(amountPaid - calculateTotal(lineItems)));
}

type DraftReadinessCheck = {
  payerName: string;
  lineItems: DraftLineItem[];
  amountPaid: number;
  /** Inside the rule, not composed onto it at the provider, which is how
   * the verdict and the reasons came to be stated separately. */
  isSyncing: boolean;
};

export type DraftReadiness = {
  ready: boolean;
  /** What stops it, as the labels the form already uses. */
  reasons: string[];
};

/** Whether a draft can be confirmed, and why not. See `CONTEXT.md`, Draft
 * readiness, for why this is one function rather than two. */
export function draftReadiness({
  payerName,
  lineItems,
  amountPaid,
  isSyncing,
}: DraftReadinessCheck): DraftReadiness {
  const reasons: string[] = [];
  if (!payerName.trim()) reasons.push("Payer Name");
  if (lineItems.length === 0) reasons.push("At least 1 item");
  // Only flag amount-paid insufficiency once there's actually a total to
  // compare against — otherwise an empty draft would show both "At
  // least 1 item" and a confusing "must cover ₱0" at the same time.
  if (
    lineItems.length > 0 &&
    roundToCents(amountPaid) < roundToCents(calculateTotal(lineItems))
  ) {
    reasons.push("Amount Paid (must cover total)");
  }
  // Last, where the provider used to append it. The order is user-visible.
  if (isSyncing) reasons.push("Still syncing — please wait a moment");

  return { ready: reasons.length === 0, reasons };
}
