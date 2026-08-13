// TODO(transactions-api): FeeCatalogItem currently mirrors the `Service`
// shape (see CONTEXT.md — a Service is "the actual unit of inventory...
// what gets charged in a transaction"). Once the transactions backend
// exists, replace `src/features/transactions/data/mock-fee-catalog.ts`
// with a real `getServices` call and this type can be dropped in favor of
// promoting `Service` to `src/api/` (bulletproof-react's shared API tier),
// the same way `ItemCode` was promoted for the item-code combobox.
export type FeeCatalogItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  itemCode: string;
};

export type ReceiptLineItem = {
  id: string;
  feeItemId: number;
  name: string;
  price: number;
  quantity: number;
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
