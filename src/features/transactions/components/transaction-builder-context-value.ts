import { createContext } from "react";
import type {
  FeeCatalogItem,
  PriceRangeValue,
  DraftLineItem,
  SortByValue,
  TransactionDTO,
} from "../types";

// Two contexts, split by who reads what: one context meant every keystroke
// on either side re-rendered all three panels. `addFeeItem` is the
// exception, triggered from the catalog side but mutating draft state, so
// it sits in `CatalogBuilderActions` with a stabilised identity.

export type CatalogBuilderState = {
  search: string;
  selectedItemCodes: string[];
  priceRange: PriceRangeValue;
  sortBy: SortByValue;
};

export type CatalogBuilderActions = {
  setSearch: (search: string) => void;
  toggleItemCode: (itemCode: string) => void;
  setPriceRange: (priceRange: PriceRangeValue) => void;
  setSortBy: (sortBy: SortByValue) => void;
  addFeeItem: (feeItem: FeeCatalogItem) => void;
};

export type CatalogBuilderMeta = {
  filteredCatalog: FeeCatalogItem[];
  itemCodeCounts: Record<string, number>;
  isCatalogLoading: boolean;
  isCatalogError: boolean;
};

export type CatalogBuilderValue = {
  state: CatalogBuilderState;
  actions: CatalogBuilderActions;
  meta: CatalogBuilderMeta;
};

export type TransactionDraftState = {
  transactionId: number | null;
  payerName: string;
  amountPaid: number;
  lineItems: DraftLineItem[];
};

export type TransactionDraftActions = {
  setPayerName: (payerName: string) => void;
  setAmountPaid: (amountPaid: number) => void;
  setLineItemQuantity: (lineItemId: string, quantity: number) => void;
  removeLineItem: (lineItemId: string) => void;
  cancelDraft: () => void;
  confirmTransaction: (
    onSuccess?: (transaction: TransactionDTO) => void,
  ) => void;
};

export type TransactionDraftMeta = {
  total: number;
  change: number;
  canConfirm: boolean;
  missingRequirements: string[];
  isConfirming: boolean;
  isCancelling: boolean;
  // Outstanding backend-sync work for the draft — see isSyncing in
  // transaction-builder-context.tsx.
  isSyncing: boolean;
  // Fees with outstanding add activity — locks their line (isLineItemLocked).
  pendingFeeItemIds: ReadonlySet<number>;
  // Fees the cashier asked to remove while still locked — row stays
  // visible showing "removing…" instead of vanishing.
  pendingRemovalFeeItemIds: ReadonlySet<number>;
};

export type TransactionDraftValue = {
  state: TransactionDraftState;
  actions: TransactionDraftActions;
  meta: TransactionDraftMeta;
};

// Split out so transaction-builder-context.tsx only exports a component
// (react-refresh constraint — same pattern as use-item-code-search.ts).
export const CatalogBuilderContext =
  createContext<CatalogBuilderValue | null>(null);
export const TransactionDraftContext =
  createContext<TransactionDraftValue | null>(null);
