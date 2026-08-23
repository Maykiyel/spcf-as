import { createContext } from "react";
import type {
  FeeCatalogItem,
  PriceRangeValue,
  ReceiptLineItem,
  SortByValue,
} from "../types";

export type TransactionBuilderState = {
  transactionId: number | null;
  payerName: string;
  amountPaid: number;
  lineItems: ReceiptLineItem[];
  search: string;
  selectedItemCodes: string[];
  priceRange: PriceRangeValue;
  sortBy: SortByValue;
};

export type TransactionBuilderActions = {
  setPayerName: (payerName: string) => void;
  setAmountPaid: (amountPaid: number) => void;
  setSearch: (search: string) => void;
  toggleItemCode: (itemCode: string) => void;
  setPriceRange: (priceRange: PriceRangeValue) => void;
  setSortBy: (sortBy: SortByValue) => void;
  addFeeItem: (feeItem: FeeCatalogItem) => void;
  setLineItemQuantity: (lineItemId: string, quantity: number) => void;
  removeLineItem: (lineItemId: string) => void;
  cancelReceipt: () => void;
  confirmTransaction: () => void;
};

export type TransactionBuilderMeta = {
  filteredCatalog: FeeCatalogItem[];
  itemCodeCounts: Record<string, number>;
  isCatalogLoading: boolean;
  isCatalogError: boolean;
  total: number;
  change: number;
  canConfirm: boolean;
  missingRequirements: string[];
  isConfirming: boolean;
  isCancelling: boolean;
  // Outstanding backend-sync work for the receipt — see isSyncing in
  // transaction-builder-context.tsx.
  isSyncing: boolean;
  // Fees with outstanding add activity — locks their line (isLineItemLocked).
  pendingFeeItemIds: ReadonlySet<number>;
  // Fees the cashier asked to remove while still locked — row stays
  // visible showing "removing…" instead of vanishing.
  pendingRemovalFeeItemIds: ReadonlySet<number>;
};

export type TransactionBuilderContextValue = {
  state: TransactionBuilderState;
  actions: TransactionBuilderActions;
  meta: TransactionBuilderMeta;
};

// Split out so transaction-builder-context.tsx only exports a component
// (react-refresh constraint — same pattern as use-item-code-search.ts).
export const TransactionBuilderContext =
  createContext<TransactionBuilderContextValue | null>(null);
