import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { notifyWarning } from "@/lib/notifications/notifications";
import { MOCK_FEE_CATALOG } from "../data/mock-fee-catalog";
import {
  countByItemCode,
  filterFeeCatalog,
  sortFeeCatalog,
} from "../lib/fee-catalog-filters";
import {
  addOrIncrementLineItem,
  calculateTotal,
  canConfirmTransaction,
  getMissingRequirements,
  setLineItemQuantity,
} from "../lib/receipt";
import type {
  FeeCatalogItem,
  PriceRangeValue,
  ReceiptLineItem,
  SortByValue,
} from "../types";

type TransactionBuilderState = {
  payerName: string;
  lineItems: ReceiptLineItem[];
  search: string;
  selectedItemCodes: string[];
  priceRange: PriceRangeValue;
  sortBy: SortByValue;
};

type TransactionBuilderActions = {
  setPayerName: (payerName: string) => void;
  setSearch: (search: string) => void;
  toggleItemCode: (itemCode: string) => void;
  setPriceRange: (priceRange: PriceRangeValue) => void;
  setSortBy: (sortBy: SortByValue) => void;
  addFeeItem: (feeItem: FeeCatalogItem) => void;
  setLineItemQuantity: (lineItemId: string, quantity: number) => void;
  removeLineItem: (lineItemId: string) => void;
  resetReceipt: () => void;
  confirmTransaction: () => void;
};

type TransactionBuilderMeta = {
  filteredCatalog: FeeCatalogItem[];
  itemCodeCounts: Record<string, number>;
  total: number;
  canConfirm: boolean;
  missingRequirements: string[];
};

type TransactionBuilderContextValue = {
  state: TransactionBuilderState;
  actions: TransactionBuilderActions;
  meta: TransactionBuilderMeta;
};

const TransactionBuilderContext =
  createContext<TransactionBuilderContextValue | null>(null);

const INITIAL_STATE: TransactionBuilderState = {
  payerName: "",
  lineItems: [],
  search: "",
  selectedItemCodes: [],
  priceRange: "all",
  sortBy: "name-asc",
};

type TransactionBuilderProviderProps = {
  children: ReactNode;
  catalog?: FeeCatalogItem[];
};

export function TransactionBuilderProvider({
  children,
  catalog = MOCK_FEE_CATALOG,
}: TransactionBuilderProviderProps) {
  const [payerName, setPayerName] = useState(INITIAL_STATE.payerName);
  const [lineItems, setLineItems] = useState(INITIAL_STATE.lineItems);
  const [search, setSearch] = useState(INITIAL_STATE.search);
  const [selectedItemCodes, setSelectedItemCodes] = useState(
    INITIAL_STATE.selectedItemCodes,
  );
  const [priceRange, setPriceRange] = useState(INITIAL_STATE.priceRange);
  const [sortBy, setSortBy] = useState(INITIAL_STATE.sortBy);

  const toggleItemCode = (itemCode: string) => {
    setSelectedItemCodes((current) =>
      current.includes(itemCode)
        ? current.filter((code) => code !== itemCode)
        : [...current, itemCode],
    );
  };

  const addFeeItem = (feeItem: FeeCatalogItem) => {
    setLineItems((current) =>
      addOrIncrementLineItem(current, feeItem, crypto.randomUUID()),
    );
  };

  const handleSetLineItemQuantity = (lineItemId: string, quantity: number) => {
    setLineItems((current) =>
      setLineItemQuantity(current, lineItemId, quantity),
    );
  };

  const removeLineItem = (lineItemId: string) => {
    setLineItems((current) => current.filter((item) => item.id !== lineItemId));
  };

  const resetReceipt = () => {
    setPayerName(INITIAL_STATE.payerName);
    setLineItems(INITIAL_STATE.lineItems);
  };

  const confirmTransaction = () => {
    notifyWarning(
      "Transactions aren't saved yet — backend integration is coming soon.",
    );
    resetReceipt();
  };

  const filteredCatalog = useMemo(
    () =>
      sortFeeCatalog(
        filterFeeCatalog(catalog, {
          search,
          itemCodes: selectedItemCodes,
          priceRange,
        }),
        sortBy,
      ),
    [catalog, search, selectedItemCodes, priceRange, sortBy],
  );

  const itemCodeCounts = useMemo(() => countByItemCode(catalog), [catalog]);
  const total = useMemo(() => calculateTotal(lineItems), [lineItems]);

  const canConfirm = canConfirmTransaction({ payerName, lineItems });
  const missingRequirements = getMissingRequirements({ payerName, lineItems });

  const value: TransactionBuilderContextValue = {
    state: {
      payerName,
      lineItems,
      search,
      selectedItemCodes,
      priceRange,
      sortBy,
    },
    actions: {
      setPayerName,
      setSearch,
      toggleItemCode,
      setPriceRange,
      setSortBy,
      addFeeItem,
      setLineItemQuantity: handleSetLineItemQuantity,
      removeLineItem,
      resetReceipt,
      confirmTransaction,
    },
    meta: {
      filteredCatalog,
      itemCodeCounts,
      total,
      canConfirm,
      missingRequirements,
    },
  };

  return (
    <TransactionBuilderContext value={value}>
      {children}
    </TransactionBuilderContext>
  );
}

export function useTransactionBuilder(): TransactionBuilderContextValue {
  const context = use(TransactionBuilderContext);
  if (!context) {
    throw new Error(
      "useTransactionBuilder must be used within a TransactionBuilderProvider",
    );
  }
  return context;
}
