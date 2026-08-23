import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { notifySuccess, notifyMutationError } from "@/lib/notifications/notifications";
import { getFeeCatalog } from "../api/get-fee-catalog";
import { saveTransaction } from "../api/save-transaction";
import {
  countByItemCode,
  filterFeeCatalog,
  sortFeeCatalog,
} from "../lib/fee-catalog-filters";
import {
  calculateChange,
  calculateTotal,
  canConfirmTransaction,
  getMissingRequirements,
} from "../lib/receipt";
import { useLineItemSync } from "../hooks/use-line-item-sync";
import type {
  FeeCatalogItem,
  PriceRangeValue,
  SortByValue,
} from "../types";
import {
  TransactionBuilderContext,
  type TransactionBuilderContextValue,
  type TransactionBuilderState,
} from "./transaction-builder-context-value";

// Stable empty-array reference so `catalog` doesn't change identity every
// render while loading, which would defeat the useMemos below.
const EMPTY_CATALOG: FeeCatalogItem[] = [];

const INITIAL_STATE: Omit<
  TransactionBuilderState,
  "search" | "selectedItemCodes" | "priceRange" | "sortBy" | "transactionId" | "lineItems"
> = {
  payerName: "",
  amountPaid: 0,
};

type TransactionBuilderProviderProps = {
  children: ReactNode;
  // Test-only: bypasses the getFeeCatalog network call with fixed data.
  catalogOverride?: FeeCatalogItem[];
};

export function TransactionBuilderProvider({
  children,
  catalogOverride,
}: TransactionBuilderProviderProps) {
  const lineItemSync = useLineItemSync();

  const [payerName, setPayerName] = useState(INITIAL_STATE.payerName);
  const [amountPaid, setAmountPaid] = useState(INITIAL_STATE.amountPaid);
  const [search, setSearch] = useState("");
  const [selectedItemCodes, setSelectedItemCodes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<PriceRangeValue>("all");
  const [sortBy, setSortBy] = useState<SortByValue>("name-asc");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const {
    data: fetchedCatalog,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
  } = useQuery({
    queryKey: ["transactions", "fee-catalog"],
    queryFn: getFeeCatalog,
    enabled: catalogOverride === undefined,
  });

  const catalog = catalogOverride ?? fetchedCatalog ?? EMPTY_CATALOG;

  const toggleItemCode = (itemCode: string) => {
    setSelectedItemCodes((current) =>
      current.includes(itemCode)
        ? current.filter((code) => code !== itemCode)
        : [...current, itemCode],
    );
  };

  // Not gated on isSyncing (unlike Confirm) — Cancel should feel instant;
  // useLineItemSync.cancel() resolves internally instead (drains
  // in-flight adds, resolves the effective transaction id, calls the
  // cancel API, resets its own state). This wrapper only owns the
  // receipt-level fields the hook doesn't know about.
  const cancelReceipt = async () => {
    setIsCancelling(true);
    try {
      await lineItemSync.cancel();
      setPayerName(INITIAL_STATE.payerName);
      setAmountPaid(INITIAL_STATE.amountPaid);
    } catch (error) {
      notifyMutationError(
        error,
        "Couldn't cancel the transaction. Please try again.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const confirmTransaction = async () => {
    // canConfirm already requires !isSyncing, so this is just type
    // narrowing, not a real-world path.
    if (!lineItemSync.transactionId) return;

    setIsConfirming(true);
    try {
      const saved = await saveTransaction(lineItemSync.transactionId, {
        customer_name: payerName.trim(),
        amount_paid: amountPaid,
      });
      notifySuccess(
        saved.series_number
          ? `Transaction completed — Receipt #${saved.series_number}.`
          : "Transaction completed successfully.",
      );
      lineItemSync.reset();
      setPayerName(INITIAL_STATE.payerName);
      setAmountPaid(INITIAL_STATE.amountPaid);
    } catch (error) {
      notifyMutationError(
        error,
        "Couldn't complete the transaction. Please try again.",
      );
    } finally {
      setIsConfirming(false);
    }
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
  const total = useMemo(
    () => calculateTotal(lineItemSync.lineItems),
    [lineItemSync.lineItems],
  );
  const change = useMemo(
    () => calculateChange(lineItemSync.lineItems, amountPaid),
    [lineItemSync.lineItems, amountPaid],
  );

  const canConfirm =
    canConfirmTransaction({
      payerName,
      lineItems: lineItemSync.lineItems,
      amountPaid,
    }) && !lineItemSync.isSyncing;
  const missingRequirements = [
    ...getMissingRequirements({
      payerName,
      lineItems: lineItemSync.lineItems,
      amountPaid,
    }),
    ...(lineItemSync.isSyncing
      ? ["Still syncing — please wait a moment"]
      : []),
  ];

  const value: TransactionBuilderContextValue = {
    state: {
      transactionId: lineItemSync.transactionId,
      payerName,
      amountPaid,
      lineItems: lineItemSync.lineItems,
      search,
      selectedItemCodes,
      priceRange,
      sortBy,
    },
    actions: {
      setPayerName,
      setAmountPaid,
      setSearch,
      toggleItemCode,
      setPriceRange,
      setSortBy,
      addFeeItem: lineItemSync.addFeeItem,
      setLineItemQuantity: lineItemSync.setLineItemQuantity,
      removeLineItem: lineItemSync.removeLineItem,
      cancelReceipt,
      confirmTransaction,
    },
    meta: {
      filteredCatalog,
      itemCodeCounts,
      isCatalogLoading,
      isCatalogError,
      total,
      change,
      canConfirm,
      missingRequirements,
      isConfirming,
      isCancelling,
      isSyncing: lineItemSync.isSyncing,
      pendingFeeItemIds: lineItemSync.pendingFeeItemIds,
      pendingRemovalFeeItemIds: lineItemSync.pendingRemovalFeeItemIds,
    },
  };

  return (
    <TransactionBuilderContext value={value}>
      {children}
    </TransactionBuilderContext>
  );
}
