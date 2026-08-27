import { useCallback, useMemo, useState, type ReactNode } from "react";
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
  TransactionDTO,
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

  const lineItemSyncCancel = lineItemSync.cancel;
  const lineItemSyncReset = lineItemSync.reset;

  // Not gated on isSyncing (unlike Confirm) — Cancel should feel instant;
  // useLineItemSync.cancel() resolves internally (drains in-flight
  // adds, resolves the transaction id, calls the cancel API, resets its
  // own state). This wrapper only owns the receipt-level fields.
  //
  // Uses the destructured lineItemSyncCancel, not lineItemSync.cancel()
  // directly — oxlint's exhaustive-deps flags method calls on an object
  // dependency as needing the whole object, which would be unstable.
  const cancelReceipt = useCallback(async () => {
    setIsCancelling(true);
    try {
      await lineItemSyncCancel();
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
  }, [lineItemSyncCancel]);

  // onSuccess is a call-time argument, not a provider prop: navigating
  // after a save is a page-level decision (which page confirmed, where it
  // should go), not something TransactionBuilderProvider itself needs to
  // know — this keeps the provider free of any react-router import, so it
  // stays testable via the existing router-free harness.
  const confirmTransaction = useCallback(
    async (onSuccess?: (transaction: TransactionDTO) => void) => {
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
            ? `Transaction completed — Series receipt #${saved.series_number}.`
            : "Transaction completed successfully.",
        );
        // Before the resets, per spec: the caller navigates away on this
        // callback, and handing it the saved transaction first keeps the
        // hand-off independent of teardown ordering below.
        onSuccess?.(saved);
        lineItemSyncReset();
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
    },
    [lineItemSync.transactionId, payerName, amountPaid, lineItemSyncReset],
  );

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

  // Memoized on catalog/filter state only, so receipt-side changes don't
  // re-render FiltersPanel/FeeCatalogPanel. addFeeItem is stable (see
  // use-line-item-sync.ts) so it's safe to include.
  //
  // toggleItemCode is left out of deps: it only closes over the stable
  // setSelectedItemCodes, so every render's copy is behaviorally
  // identical — including it would just force needless recomputes.
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

  // Memoized on receipt state only, so catalog-side changes don't
  // re-render ReceiptPanel. missingRequirements is computed inline
  // (not listed as a dep) since a fresh array every render would defeat
  // the memo regardless of its content.
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
        missingRequirements: [
          ...getMissingRequirements({
            payerName,
            lineItems: lineItemSync.lineItems,
            amountPaid,
          }),
          ...(lineItemSync.isSyncing
            ? ["Still syncing — please wait a moment"]
            : []),
        ],
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
      cancelReceipt,
      confirmTransaction,
      total,
      change,
      canConfirm,
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
