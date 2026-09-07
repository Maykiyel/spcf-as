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
// `lib/transaction-draft.ts`). That optimistic id is either replaced with the real
// backend id once the add confirms, or the whole optimistic bump is
// undone by `revertOptimisticIncrement` if the add fails — a line never
// only ever appears after server confirmation.
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

// Mirrors TransactionItemResource as the *index* endpoint sends it. That
// query selects only `id, service_name, transaction_id, subtotal`, and the
// resource suppresses `subtotal` when `price` is absent — so a list row's
// items carry a name and nothing else. Checked against the backend source;
// not worth a backend change, because the receipts list deliberately shows
// no per-item money (per-item money is what the detail page is for).
export type TransactionListItemDTO = {
  id: number;
  name: string;
};

// Every scalar TransactionResource returns, which is every context's
// version of the same transaction. Three variants exist across the app —
// the detail pages (full items), the receipts and Void lists (names only),
// and the report endpoints (no items at all) — and the *only* thing that
// differs between them is the item shape, so it is the only thing the
// variants below restate.
//
// Not exported: nothing consumes a transaction without knowing which
// variant it holds, and a bare base would be a fourth shape that means
// "some transaction, items unknown".
//
// `voided_at` and `voided_by` are absent deliberately. Both are `when(...)`
// on the resource, and `voided_by` needs an eager load the index endpoint
// doesn't do — so they belong to whichever variant can actually promise
// them, not here. #62 settled it: they are on `TransactionDTO` and on
// nothing else. See the note there, and on `TransactionListRow`.
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

// The full shape returned by save/cancel/show.
//
// Optional rather than nullable, because the resource omits both keys
// rather than sending null: `voided_at` is a `when($this->voided_at, ...)`
// and `voided_by` a `whenLoaded('voidedBy')`. A voided transaction has
// both, anything else has neither.
//
// **`voided_by` is only ever this shape's to promise.** `show` eager-loads
// `voidedBy` only once the status is `returned`, and no other endpoint
// loads it at all — `void`'s own response reloads `items` and `cashier` and
// stops there, so even the call that sets the field doesn't return it.
// Checked against the controller, not inferred.
export type TransactionDTO = TransactionBase & {
  items: TransactionItemDTO[];
  voided_at?: string;
  voided_by?: { id: number; full_name: string };
};

// One row of `GET /transactions`.
//
// A distinct type rather than a loosened `TransactionDTO`: making
// `price`/`quantity`/`subtotal` optional so one type could serve both
// would push null-handling into the detail and print pages, where those
// values are genuinely guaranteed — weakening types that are accurate
// today to describe a context that never sees them.
//
// Carries neither void field, for two different reasons. `voided_by`
// cannot be here: `index` does not eager-load `voidedBy`, so it is absent
// from a list row even for a voided transaction. `voided_at` could be —
// it is a plain column and is sent whenever it is non-null — but no list
// renders it, and a field declared before something reads it is a promise
// nothing is checking. Add it when a column wants it.
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
