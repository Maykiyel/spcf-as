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
  CatalogBuilderContext,
  ReceiptBuilderContext,
  type CatalogBuilderValue,
  type ReceiptBuilderValue,
} from "./transaction-builder-context-value";

// Stable empty-array reference so `catalog` doesn't change identity every
// render while loading, which would defeat the useMemos below.
const EMPTY_CATALOG: FeeCatalogItem[] = [];

const INITIAL_PAYER_NAME = "";
const INITIAL_AMOUNT_PAID = 0;

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

  const [payerName, setPayerName] = useState(INITIAL_PAYER_NAME);
  const [amountPaid, setAmountPaid] = useState(INITIAL_AMOUNT_PAID);
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
      setPayerName(INITIAL_PAYER_NAME);
      setAmountPaid(INITIAL_AMOUNT_PAID);
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
      setPayerName(INITIAL_PAYER_NAME);
      setAmountPaid(INITIAL_AMOUNT_PAID);
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

  // Memoized on catalog/filter fields only, so typing in the payer-name
  // or amount fields (receipt side) never changes this reference — it's
  // what actually stops FiltersPanel/FeeCatalogPanel from re-rendering on
  // receipt-only changes. addFeeItem is safe to include here despite
  // coming from lineItemSync because it has a permanently stable identity
  // (see use-line-item-sync.ts).
  //
  // toggleItemCode is deliberately left out of the deps below: it's
  // recreated every render but only ever closes over setSelectedItemCodes
  // (React-stable) and its own argument, so every render's copy behaves
  // identically — including it would just force this memo to recompute
  // every render for no behavioral difference.
  const catalogValue: CatalogBuilderValue = useMemo(
    () => ({
      state: { search, selectedItemCodes, priceRange, sortBy },
      actions: {
        setSearch,
        toggleItemCode,
        setPriceRange,
        setSortBy,
        addFeeItem: lineItemSync.addFeeItem,
      },
      meta: {
        filteredCatalog,
        itemCodeCounts,
        isCatalogLoading,
        isCatalogError,
      },
    }),
    [
      search,
      selectedItemCodes,
      priceRange,
      sortBy,
      lineItemSync.addFeeItem,
      filteredCatalog,
      itemCodeCounts,
      isCatalogLoading,
      isCatalogError,
    ],
  );

  // Memoized on receipt fields only, so typing in the fee-catalog search
  // box or toggling filters never changes this reference — that's what
  // stops ReceiptPanel from re-rendering on catalog-only changes.
  //
  // cancelReceipt/confirmTransaction are deliberately left out of the
  // deps below: both are recreated every render, but every reactive value
  // either closes over (payerName, amountPaid, lineItemSync.transactionId)
  // is already listed, and the rest (lineItemSync.cancel/.reset,
  // notify*, saveTransaction) either only touch refs/stable setters or
  // are module-level imports — so whenever this memo actually needs to
  // recompute, it already does, and including these two would just make
  // it recompute on every render instead.
  const receiptValue: ReceiptBuilderValue = useMemo(
    () => ({
      state: {
        transactionId: lineItemSync.transactionId,
        payerName,
        amountPaid,
        lineItems: lineItemSync.lineItems,
      },
      actions: {
        setPayerName,
        setAmountPaid,
        setLineItemQuantity: lineItemSync.setLineItemQuantity,
        removeLineItem: lineItemSync.removeLineItem,
        cancelReceipt,
        confirmTransaction,
      },
      meta: {
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
    }),
    [
      lineItemSync.transactionId,
      payerName,
      amountPaid,
      lineItemSync.lineItems,
      lineItemSync.setLineItemQuantity,
      lineItemSync.removeLineItem,
      total,
      change,
      canConfirm,
      missingRequirements,
      isConfirming,
      isCancelling,
      lineItemSync.isSyncing,
      lineItemSync.pendingFeeItemIds,
      lineItemSync.pendingRemovalFeeItemIds,
    ],
  );

  return (
    <CatalogBuilderContext value={catalogValue}>
      <ReceiptBuilderContext value={receiptValue}>
        {children}
      </ReceiptBuilderContext>
    </CatalogBuilderContext>
  );
}
