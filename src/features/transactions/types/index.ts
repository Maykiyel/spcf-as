// Fee Catalog panel's own display shape. Built from the shared `Service`
// type (`@/api/services`) via `serviceToFeeCatalogItem` — kept as a
// separate type rather than using `Service` directly because the catalog
// filtering/sorting lib (`lib/fee-catalog-filters.ts`) wants a flat
// `itemCode: string`, not `Service`'s optional `{id, name}` object.
export type FeeCatalogItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  itemCode: string;
};

// `id` is a string (used as a React list key, matching this app's
// DataTable-style string ids elsewhere) — either the backend
// TransactionItem id once a line has round-tripped through the server
// and been reconciled by `upsertLineItemFromDTO`, or, before that, a
// client-only `optimistic-${feeItemId}` id assigned immediately on add
// (see `addOrIncrementLineItem`, `isPendingLineItem` in
// `lib/receipt.ts`). That optimistic id is either replaced with the real
// backend id once the add confirms, or the whole optimistic bump is
// undone by `revertOptimisticIncrement` if the add fails — a line never
// only ever appears after server confirmation.
export type ReceiptLineItem = {
  id: string;
  feeItemId: number;
  name: string;
  price: number;
  quantity: number;
};

export const TRANSACTION_STATUSES = [
  "pending",
  "abandoned",
  "completed",
  "cancelled",
  "returned",
] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

// Response shape of POST /transactions ("Initiate Transaction") — the only
// endpoint that returns this trimmed shape rather than the full
// TransactionResource; there's no `items`/`total`/`customer_name` yet
// because nothing has been added or saved.
export type InitiatedTransaction = {
  id: number;
  status: TransactionStatus;
  cashier: { id: number; full_name: string };
};

// Mirrors TransactionItemResource. `price`/`quantity`/`subtotal` are typed
// as required numbers (not optional) because every context this DTO is
// used in — add-item and update-quantity responses — always populates
// them; the backend's `whenNotNull` wrapper exists for a leaner "index"
// listing this frontend doesn't currently consume.
export type TransactionItemDTO = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
};

// What the cashier asked for on a line item that's currently locked (still
// on its optimistic client-only id, or its fee has a repeat-add still
// debouncing/in-flight) — remembered and replayed once that fee settles,
// instead of blocking the input until then. Only one intent per fee at a
// time; a newer action (including a fresh Add) always supersedes an older
// queued one, never merges with it.
export type PendingLineItemIntent =
  | { type: "setQuantity"; quantity: number }
  | { type: "remove" };

// Mirrors TransactionResource — the full shape returned by save/cancel/show.
export type TransactionDTO = {
  control_id: number;
  cashier: { id: number; full_name: string } | null;
  series_number: number | null;
  customer_name: string | null;
  items: TransactionItemDTO[];
  total: number | null;
  amount_paid: number;
  change_amount: number;
  status: TransactionStatus;
  date: string;
};

export const PRICE_RANGE_VALUES = [
  "all",
  "under-300",
  "300-1000",
  "over-1000",
] as const;

export type PriceRangeValue = (typeof PRICE_RANGE_VALUES)[number];

export const PRICE_RANGE_LABELS: Record<PriceRangeValue, string> = {
  all: "All",
  "under-300": "Under ₱300",
  "300-1000": "₱300–1,000",
  "over-1000": "Over ₱1,000",
};

export const SORT_BY_VALUES = [
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
] as const;

export type SortByValue = (typeof SORT_BY_VALUES)[number];

export const SORT_BY_LABELS: Record<SortByValue, string> = {
  "name-asc": "Name (A-Z)",
  "name-desc": "Name (Z-A)",
  "price-asc": "Price (Low-High)",
  "price-desc": "Price (High-Low)",
};

function isOneOf<T extends string>(
  values: readonly T[],
  value: string,
): value is T {
  return (values as readonly string[]).includes(value);
}

export function isPriceRangeValue(value: string): value is PriceRangeValue {
  return isOneOf(PRICE_RANGE_VALUES, value);
}

export function isSortByValue(value: string): value is SortByValue {
  return isOneOf(SORT_BY_VALUES, value);
}
