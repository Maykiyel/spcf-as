// The Fee Catalog's display shape, built from `Service` via
// `serviceToFeeCatalogItem`. Separate because the catalog's filtering lib
// wants a flat `itemCode: string`, not `Service`'s optional object.
export type FeeCatalogItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  itemCode: string;
};

// `id` is a string because it may be a client-only `optimistic-${feeItemId}`
// before the add confirms, replaced with the backend id afterwards or
// undone if it fails. See `lib/transaction-draft.ts`.
export type DraftLineItem = {
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

// `POST /transactions` alone returns this trimmed shape: nothing has been
// added or saved yet.
export type InitiatedTransaction = {
  id: number;
  status: TransactionStatus;
  cashier: { id: number; full_name: string };
};

// Mirrors TransactionItemResource. The money fields are required because
// every context using this DTO populates them.
export type TransactionItemDTO = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
};

// What the cashier asked for while a line item was locked, replayed once
// its fee settles rather than blocking the input. One intent per fee: a
// newer action supersedes an older queued one, never merges with it.
export type PendingLineItemIntent =
  | { type: "setQuantity"; quantity: number }
  | { type: "remove" };

// As the *index* endpoint sends it: a name and nothing else, because that
// query never selects `price`. Deliberate, since per-item money is what
// the detail page is for.
export type TransactionListItemDTO = {
  id: number;
  name: string;
};

// Every scalar TransactionResource returns. The variants below differ only
// in their item shape, so it is the only thing they restate. Not exported:
// a bare base would mean "some transaction, items unknown".
//
// The void fields live on whichever variant can actually promise them,
// which is `TransactionDTO` and nothing else.
type TransactionBase = {
  control_id: number;
  cashier: { id: number; full_name: string } | null;
  series_number: number | null;
  customer_name: string | null;
  total: number | null;
  amount_paid: number;
  change_amount: number;
  status: TransactionStatus;
  date: string;
};

// The full shape returned by save/cancel/show. The void fields are
// optional, not nullable: the resource omits the keys rather than sending
// null, so a voided transaction has both and anything else has neither.
//
// `voided_by` comes back only from `show`, and only once the status is
// `returned`. Not even `void`'s own response carries it. See
// BACKEND_NOTES.md; checked against the controller, not inferred.
export type TransactionDTO = TransactionBase & {
  items: TransactionItemDTO[];
  voided_at?: string;
  voided_by?: { id: number; full_name: string };
};

// One row of `GET /transactions`.
//
// A distinct type, not a loosened `TransactionDTO`: making the money
// fields optional would push null-handling into the detail and print
// pages, where they are genuinely guaranteed.
//
// Neither void field, for different reasons. `voided_by` cannot be here at
// all, since `index` doesn't eager-load it. `voided_at` could be, but no
// list renders it yet. Add it when a column wants it.
export type TransactionListRow = TransactionBase & {
  items: TransactionListItemDTO[];
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
