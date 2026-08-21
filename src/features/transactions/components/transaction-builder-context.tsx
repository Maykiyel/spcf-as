import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSetState } from "@/hooks/use-set-state";
import {
  notifySuccess,
  notifyMutationError,
} from "@/lib/notifications/notifications";
import { getFeeCatalog } from "../api/get-fee-catalog";
import { initiateTransaction } from "../api/initiate-transaction";
import { addTransactionItem } from "../api/add-transaction-item";
import { updateTransactionItemQuantity } from "../api/update-transaction-item-quantity";
import { deleteTransactionItem } from "../api/delete-transaction-item";
import { saveTransaction } from "../api/save-transaction";
import { cancelTransaction } from "../api/cancel-transaction";
import {
  countByItemCode,
  filterFeeCatalog,
  sortFeeCatalog,
} from "../lib/fee-catalog-filters";
import {
  addOrIncrementLineItem,
  calculateChange,
  calculateTotal,
  canConfirmTransaction,
  getMissingRequirements,
  isLineItemLocked,
  revertOptimisticIncrement,
  setLineItemQuantity,
  upsertLineItemFromDTO,
} from "../lib/receipt";
import type {
  FeeCatalogItem,
  PendingLineItemIntent,
  PriceRangeValue,
  SortByValue,
  TransactionItemDTO,
} from "../types";
import {
  TransactionBuilderContext,
  type TransactionBuilderContextValue,
  type TransactionBuilderState,
} from "./transaction-builder-context-value";

// Debounce window for coalescing rapid input (quantity edits, add clicks)
// into fewer network calls. Matches the debounce used elsewhere in the app.
const DEBOUNCE_MS = 400;

// Safety cap on cancelReceipt's drain loop — shouldn't ever be hit.
const MAX_CANCEL_DRAIN_ROUNDS = 10;

// Stable empty-array reference so `catalog` doesn't change identity every
// render while loading, which would defeat the useMemos below.
const EMPTY_CATALOG: FeeCatalogItem[] = [];

const INITIAL_STATE: Omit<
  TransactionBuilderState,
  "search" | "selectedItemCodes" | "priceRange" | "sortBy"
> = {
  transactionId: null,
  payerName: "",
  amountPaid: 0,
  lineItems: [],
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
  const [transactionId, setTransactionId] = useState(
    INITIAL_STATE.transactionId,
  );
  const [payerName, setPayerName] = useState(INITIAL_STATE.payerName);
  const [amountPaid, setAmountPaid] = useState(INITIAL_STATE.amountPaid);
  const [lineItems, setLineItems] = useState(INITIAL_STATE.lineItems);
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

  // Dedupes concurrent "add fee" clicks racing to initiate the transaction:
  // all callers within the same window await this one in-flight promise
  // instead of each POSTing their own pending transaction.
  const initiatingRef = useRef<Promise<number> | null>(null);
  // Reactive mirror of "is initiate in flight" — Confirm needs to know
  // this (see isSyncing) but the ref above doesn't trigger re-renders.
  const [isInitiating, setIsInitiating] = useState(false);

  const ensureTransaction = async (): Promise<number> => {
    if (transactionId) return transactionId;

    if (!initiatingRef.current) {
      setIsInitiating(true);
      initiatingRef.current = initiateTransaction()
        .then((transaction) => {
          setTransactionId(transaction.id);
          return transaction.id;
        })
        .finally(() => {
          initiatingRef.current = null;
          setIsInitiating(false);
        });
    }

    return initiatingRef.current;
  };

  // Per-line-item debounce state for quantity edits, keyed by lineItemId.
  const quantityTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const latestRequestedQuantityRef = useRef<Record<string, number>>({});

  // Lines with an outstanding quantity write (scheduled or in-flight) —
  // feeds isSyncing, which gates Confirm.
  const [pendingQuantityLineItemIds, pendingQuantitySet] = useSetState<string>();

  const markQuantityPending = pendingQuantitySet.add;

  // Skip clearing if a newer edit already scheduled its own timeout —
  // there's still more work coming for this line.
  const clearQuantityPendingIfSettled = (lineItemId: string) => {
    if (quantityTimeoutsRef.current[lineItemId]) return;
    pendingQuantitySet.remove(lineItemId);
  };

  useEffect(() => {
    const timeouts = quantityTimeoutsRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  const toggleItemCode = (itemCode: string) => {
    setSelectedItemCodes((current) =>
      current.includes(itemCode)
        ? current.filter((code) => code !== itemCode)
        : [...current, itemCode],
    );
  };

  // Add-fee batching state, keyed by feeItemId (the service id).
  // - pendingAddCountsRef: clicks accumulated since the last flush.
  // - addFlushTimeoutsRef: debounce timer for the next flush.
  // - addInFlightRef: at most one add request per fee in flight at once —
  //   this (not the debounce) is what prevents responses landing out of
  //   order; two coalesced batches could still race otherwise.
  // - addInFlightPromisesRef: the running flush's promise, so cancelReceipt
  //   can await it before deciding what to cancel.
  const pendingAddCountsRef = useRef<Record<number, number>>({});
  const addFlushTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>(
    {},
  );
  const addInFlightRef = useRef<Record<number, boolean>>({});
  const addInFlightPromisesRef = useRef<Record<number, Promise<void>>>({});

  // What the cashier asked for on a line that was locked at the time,
  // keyed by feeItemId — replayed once that fee settles (applyQueuedIntent).
  const pendingIntentsRef = useRef<Record<number, PendingLineItemIntent>>({});

  // Fees with outstanding add activity (scheduled or in-flight) — feeds
  // isLineItemLocked and isSyncing.
  const [pendingFeeItemIds, pendingFeeSet] = useSetState<number>();

  // Fees the cashier asked to remove while still locked — separate from
  // pendingFeeItemIds because it drives distinct UI: the row stays but
  // shows "removing…" instead of behaving normally.
  const [pendingRemovalFeeItemIds, pendingRemovalSet] = useSetState<number>();

  const markFeeItemPending = pendingFeeSet.add;
  const clearFeeItemPending = pendingFeeSet.remove;
  const markFeeItemPendingRemoval = pendingRemovalSet.add;
  const clearFeeItemPendingRemoval = pendingRemovalSet.remove;

  useEffect(() => {
    const timeouts = addFlushTimeoutsRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  // Fires the PATCH for a quantity change. No locking decisions here —
  // the caller must have already confirmed it's safe to sync this line.
  // currentTransactionId is a parameter, not read from the outer closure,
  // because applyQueuedIntent can call this from an async continuation
  // bound to a render from before transactionId was set.
  const syncLineItemQuantity = (
    currentTransactionId: number,
    lineItemId: string,
    quantity: number,
  ) => {
    latestRequestedQuantityRef.current[lineItemId] = quantity;
    markQuantityPending(lineItemId);

    const existingTimeout = quantityTimeoutsRef.current[lineItemId];
    if (existingTimeout) clearTimeout(existingTimeout);

    quantityTimeoutsRef.current[lineItemId] = setTimeout(() => {
      delete quantityTimeoutsRef.current[lineItemId];
      const requestedQuantity = latestRequestedQuantityRef.current[lineItemId];

      updateTransactionItemQuantity(
        currentTransactionId,
        Number(lineItemId),
        requestedQuantity,
      )
        .then((item) => {
          // A newer change superseded this request while it was in
          // flight — drop the response rather than clobber the newer
          // (already-sent or still-debouncing) value.
          if (
            latestRequestedQuantityRef.current[lineItemId] !==
            requestedQuantity
          ) {
            return;
          }
          setLineItems((current) =>
            current.map((existing) =>
              existing.id === lineItemId
                ? { ...existing, quantity: item.quantity, price: item.price }
                : existing,
            ),
          );
        })
        .catch((error: unknown) => {
          notifyMutationError(
            error,
            "Couldn't update that item's quantity. Please try again.",
          );
        })
        .finally(() => {
          clearQuantityPendingIfSettled(lineItemId);
        });
    }, DEBOUNCE_MS);
  };

  // Fires the DELETE — same "no locking decisions, stale-closure-safe
  // parameter" contract as syncLineItemQuantity above.
  const syncRemoveLineItem = async (
    currentTransactionId: number,
    lineItemId: string,
  ) => {
    const pendingTimeout = quantityTimeoutsRef.current[lineItemId];
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      delete quantityTimeoutsRef.current[lineItemId];
    }

    // Revert by re-inserting the removed row at its original position
    // rather than restoring a full pre-click snapshot, which would also
    // wipe out any other change that succeeded while this was in flight.
    const removedIndex = lineItems.findIndex((item) => item.id === lineItemId);
    const removedItem = removedIndex === -1 ? null : lineItems[removedIndex];

    setLineItems((current) => current.filter((item) => item.id !== lineItemId));

    try {
      await deleteTransactionItem(currentTransactionId, Number(lineItemId));
    } catch (error) {
      notifyMutationError(error, "Couldn't remove that item. Please try again.");
      if (removedItem) {
        setLineItems((current) => {
          const next = [...current];
          next.splice(Math.min(removedIndex, next.length), 0, removedItem);
          return next;
        });
      }
    }
  };

  // Replays whatever the cashier asked for while this fee was locked, now
  // that the add has settled and resolvedItem gives us a real backend id
  // to act against. Only called from flushAddFeeItem's success path.
  const applyQueuedIntent = (
    feeItemId: number,
    resolvedItem: TransactionItemDTO,
    currentTransactionId: number,
  ) => {
    const intent = pendingIntentsRef.current[feeItemId];
    if (!intent) return;
    delete pendingIntentsRef.current[feeItemId];

    const realLineItemId = String(resolvedItem.id);

    if (intent.type === "remove") {
      clearFeeItemPendingRemoval(feeItemId);
      void syncRemoveLineItem(currentTransactionId, realLineItemId);
      return;
    }

    // Already matches what the add itself produced — nothing to sync.
    if (resolvedItem.quantity === intent.quantity) return;
    syncLineItemQuantity(currentTransactionId, realLineItemId, intent.quantity);
  };

  const flushAddFeeItem = async (feeItem: FeeCatalogItem) => {
    const id = feeItem.id;
    // A flush for this fee is already running — it'll pick up whatever
    // accumulates here once it finishes (see the finally block).
    if (addInFlightRef.current[id]) return;

    const quantity = pendingAddCountsRef.current[id] ?? 0;
    if (quantity <= 0) return;

    pendingAddCountsRef.current[id] = 0;
    addInFlightRef.current[id] = true;

    // Declared outside the try so finally can tell success from failure,
    // and so applyQueuedIntent gets a fresh (non-stale) transaction id.
    let resolvedItem: TransactionItemDTO | null = null;
    let resolvedTransactionId: number | null = null;

    try {
      const currentTransactionId = await ensureTransaction();
      // Upserts by adding `quantity` to whatever's already on the
      // transaction, so one batched call covers N clicks without the
      // out-of-order-response race N separate requests would create.
      const item = await addTransactionItem(currentTransactionId, {
        service_id: id,
        quantity,
      });
      setLineItems((current) => upsertLineItemFromDTO(current, id, item));
      resolvedItem = item;
      resolvedTransactionId = currentTransactionId;
    } catch (error) {
      setLineItems((current) =>
        revertOptimisticIncrement(current, id, quantity),
      );
      notifyMutationError(error, "Couldn't add that fee. Please try again.");
    } finally {
      addInFlightRef.current[id] = false;
      // Clicks that landed while this was in flight accumulated in
      // pendingAddCountsRef — send them now instead of waiting for
      // another debounce window.
      if ((pendingAddCountsRef.current[id] ?? 0) > 0) {
        void runFlushAddFeeItem(feeItem);
      } else {
        clearFeeItemPending(id);
        if (resolvedItem && resolvedTransactionId) {
          applyQueuedIntent(id, resolvedItem, resolvedTransactionId);
        } else {
          // The add failed — nothing exists server-side to replay against.
          delete pendingIntentsRef.current[id];
          clearFeeItemPendingRemoval(id);
        }
      }
    }
  };

  // Tracks flushAddFeeItem's promise in addInFlightPromisesRef so
  // cancelReceipt can await every running flush before cancelling —
  // otherwise a flush resolving after Cancel could resurrect an item.
  const runFlushAddFeeItem = (feeItem: FeeCatalogItem): Promise<void> => {
    const promise = flushAddFeeItem(feeItem).finally(() => {
      if (addInFlightPromisesRef.current[feeItem.id] === promise) {
        delete addInFlightPromisesRef.current[feeItem.id];
      }
    });
    addInFlightPromisesRef.current[feeItem.id] = promise;
    return promise;
  };

  const addFeeItem = (feeItem: FeeCatalogItem) => {
    // Optimistic: bump the receipt immediately, before the network call
    // resolves, so the UI doesn't lag a click behind the server.
    const optimisticId = `optimistic-${feeItem.id}`;
    setLineItems((current) =>
      addOrIncrementLineItem(current, feeItem, optimisticId),
    );

    // A fresh Add supersedes anything previously queued for this fee
    // (e.g. cashier marked it for removal, then changed their mind).
    delete pendingIntentsRef.current[feeItem.id];
    clearFeeItemPendingRemoval(feeItem.id);

    markFeeItemPending(feeItem.id);

    pendingAddCountsRef.current[feeItem.id] =
      (pendingAddCountsRef.current[feeItem.id] ?? 0) + 1;

    const existingTimeout = addFlushTimeoutsRef.current[feeItem.id];
    if (existingTimeout) clearTimeout(existingTimeout);

    addFlushTimeoutsRef.current[feeItem.id] = setTimeout(() => {
      delete addFlushTimeoutsRef.current[feeItem.id];
      void runFlushAddFeeItem(feeItem);
    }, DEBOUNCE_MS);
  };

  const handleSetLineItemQuantity = (lineItemId: string, quantity: number) => {
    const clamped = Math.max(1, quantity);

    // No-op guard: the row commits its draft quantity on blur/Enter
    // unconditionally, so skip scheduling a PATCH if nothing changed.
    const existingLineItem = lineItems.find((item) => item.id === lineItemId);
    if (existingLineItem && existingLineItem.quantity === clamped) return;

    // Reflect the cashier's intent immediately regardless of lock state.
    setLineItems((current) => setLineItemQuantity(current, lineItemId, clamped));

    if (existingLineItem && isLineItemLocked(existingLineItem, pendingFeeItemIds)) {
      // No real backend id yet, or the fee's repeat-add hasn't settled —
      // remember the target quantity; applyQueuedIntent replays it later.
      pendingIntentsRef.current[existingLineItem.feeItemId] = {
        type: "setQuantity",
        quantity: clamped,
      };
      return;
    }

    if (!transactionId) return;
    syncLineItemQuantity(transactionId, lineItemId, clamped);
  };

  const removeLineItem = (lineItemId: string) => {
    const targetLineItem = lineItems.find((item) => item.id === lineItemId);

    // Locked lines (no real id yet, or a repeat-add still settling) queue
    // the removal instead of deleting — checked before the transactionId
    // guard below, since a freshly-added optimistic line can be locked
    // while transactionId is still null (ensureTransaction hasn't run
    // yet). Row stays visible as "removing…" (see ReceiptLineItemRow)
    // rather than vanishing, since we'd lose the real id to delete.
    if (targetLineItem && isLineItemLocked(targetLineItem, pendingFeeItemIds)) {
      pendingIntentsRef.current[targetLineItem.feeItemId] = { type: "remove" };
      markFeeItemPendingRemoval(targetLineItem.feeItemId);
      return;
    }

    if (!transactionId) return;
    void syncRemoveLineItem(transactionId, lineItemId);
  };

  const resetReceipt = () => {
    // By the time this runs nothing should be scheduled or in flight
    // (Confirm gates on isSyncing; Cancel drains first) — this clearing
    // is defense-in-depth, not the primary protection.
    Object.values(quantityTimeoutsRef.current).forEach(clearTimeout);
    quantityTimeoutsRef.current = {};
    latestRequestedQuantityRef.current = {};
    pendingQuantitySet.clear();

    Object.values(addFlushTimeoutsRef.current).forEach(clearTimeout);
    addFlushTimeoutsRef.current = {};
    pendingAddCountsRef.current = {};
    pendingFeeSet.clear();

    pendingIntentsRef.current = {};
    pendingRemovalSet.clear();

    setTransactionId(INITIAL_STATE.transactionId);
    setPayerName(INITIAL_STATE.payerName);
    setAmountPaid(INITIAL_STATE.amountPaid);
    setLineItems(INITIAL_STATE.lineItems);
  };

  // Not gated on isSyncing (unlike Confirm) — Cancel should feel instant.
  // Instead it waits internally: resolves the true transaction id (the
  // in-flight initiate promise, since the closure variable can lag) and
  // drains every in-flight add first, so a late response can't resurrect
  // an item after the cashier already cancelled.
  const cancelReceipt = async () => {
    setIsCancelling(true);
    try {
      let effectiveTransactionId = transactionId;

      if (!effectiveTransactionId && initiatingRef.current) {
        try {
          effectiveTransactionId = await initiatingRef.current;
        } catch {
          // Initiate itself failed — nothing was ever created server-side.
          effectiveTransactionId = null;
        }
      }

      let drainRounds = 0;
      while (
        Object.keys(addInFlightPromisesRef.current).length > 0 &&
        drainRounds < MAX_CANCEL_DRAIN_ROUNDS
      ) {
        await Promise.allSettled(Object.values(addInFlightPromisesRef.current));
        drainRounds += 1;
      }

      if (effectiveTransactionId) {
        await cancelTransaction(effectiveTransactionId);
      }
      resetReceipt();
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
    if (!transactionId) return;

    setIsConfirming(true);
    try {
      const saved = await saveTransaction(transactionId, {
        customer_name: payerName.trim(),
        amount_paid: amountPaid,
      });
      notifySuccess(
        saved.series_number
          ? `Transaction completed — Receipt #${saved.series_number}.`
          : "Transaction completed successfully.",
      );
      resetReceipt();
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
  const total = useMemo(() => calculateTotal(lineItems), [lineItems]);
  const change = useMemo(
    () => calculateChange(lineItems, amountPaid),
    [lineItems, amountPaid],
  );

  // Any outstanding backend-sync work (initiate, a batched add, a
  // quantity write). Confirm gates on this so the button doesn't look
  // clickable while it'd actually be silently swallowed. Cancel doesn't
  // gate on this — see cancelReceipt.
  const isSyncing =
    isInitiating || pendingFeeItemIds.size > 0 || pendingQuantityLineItemIds.size > 0;

  const canConfirm =
    canConfirmTransaction({ payerName, lineItems, amountPaid }) && !isSyncing;
  const missingRequirements = [
    ...getMissingRequirements({ payerName, lineItems, amountPaid }),
    ...(isSyncing ? ["Still syncing — please wait a moment"] : []),
  ];

  const value: TransactionBuilderContextValue = {
    state: {
      transactionId,
      payerName,
      amountPaid,
      lineItems,
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
      addFeeItem,
      setLineItemQuantity: handleSetLineItemQuantity,
      removeLineItem,
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
      isSyncing,
      pendingFeeItemIds,
      pendingRemovalFeeItemIds,
    },
  };

  return (
    <TransactionBuilderContext value={value}>
      {children}
    </TransactionBuilderContext>
  );
}
