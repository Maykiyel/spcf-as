import { useCallback, useEffect, useRef, useState } from "react";
import { useSetState } from "@/hooks/use-set-state";
import { initiateTransaction } from "../api/initiate-transaction";
import { addTransactionItem } from "../api/add-transaction-item";
import { updateTransactionItemQuantity } from "../api/update-transaction-item-quantity";
import { deleteTransactionItem } from "../api/delete-transaction-item";
import { cancelTransaction } from "../api/cancel-transaction";
import { notifyMutationError } from "@/lib/notifications/notifications";
import {
  addOrIncrementLineItem,
  isLineItemLocked,
  revertOptimisticIncrement,
  setLineItemQuantity as setLineItemQuantityInList,
  upsertLineItemFromDTO,
} from "../lib/receipt";
import type {
  FeeCatalogItem,
  PendingLineItemIntent,
  ReceiptLineItem,
} from "../types";

// Debounce window for coalescing rapid add clicks into fewer network
// calls. Matches the debounce used elsewhere in the app.
const DEBOUNCE_MS = 400;

// Safety cap on cancel's drain loop — shouldn't ever be hit.
const MAX_CANCEL_DRAIN_ROUNDS = 10;

// Consolidates what were four parallel per-fee Records
// (pendingAddCountsRef, addFlushTimeoutsRef, addInFlightRef,
// addInFlightPromisesRef) into one state object per fee — "what's true
// about fee 7's add right now" was one clump traveling across four maps
// with nothing enforcing they stayed in sync; every mutation site had to
// touch the right subset in the right order.
type FeeAddState = {
  pendingCount: number;
  flushTimeout: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
  inFlightPromise: Promise<void> | null;
};

function getFeeAddState(
  states: Record<number, FeeAddState>,
  feeItemId: number,
): FeeAddState {
  const existing = states[feeItemId];
  if (existing) return existing;

  const created: FeeAddState = {
    pendingCount: 0,
    flushTimeout: null,
    inFlight: false,
    inFlightPromise: null,
  };
  states[feeItemId] = created;
  return created;
}

// Owns transaction lifecycle too, not just line items — cancel() needs
// add-draining and transaction-id resolution together, and splitting
// them across two modules recreates the ref coupling that caused this
// session's remove-on-a-locked-line bug.
export function useLineItemSync() {
  const [transactionId, setTransactionId] = useState<number | null>(null);
  const [lineItems, setLineItems] = useState<ReceiptLineItem[]>([]);

  // Dedupes concurrent "add fee" clicks racing to initiate the
  // transaction: all callers within the same window await this one
  // in-flight promise instead of each POSTing their own pending
  // transaction.
  const initiatingRef = useRef<Promise<number> | null>(null);
  // Reactive mirror of "is initiate in flight" — isSyncing needs this but
  // the ref above doesn't trigger re-renders.
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

  // Add-fee batching state, keyed by feeItemId (the service id). See
  // FeeAddState above.
  const feeAddStatesRef = useRef<Record<number, FeeAddState>>({});

  useEffect(() => {
    const states = feeAddStatesRef.current;
    return () => {
      Object.values(states).forEach((state) => {
        if (state.flushTimeout) clearTimeout(state.flushTimeout);
      });
    };
  }, []);

  // What the cashier asked for on a line that was locked at the time,
  // keyed by feeItemId — replayed once that fee settles.
  const pendingIntentsRef = useRef<Record<number, PendingLineItemIntent>>({});

  // Fees with outstanding add activity (scheduled or in-flight) — feeds
  // isLineItemLocked and isSyncing.
  const [pendingFeeItemIds, pendingFeeSet] = useSetState<number>();

  // Fees the cashier asked to remove while still locked — separate from
  // pendingFeeItemIds because it drives distinct UI: the row stays but
  // shows "removing…" instead of behaving normally.
  const [pendingRemovalFeeItemIds, pendingRemovalSet] = useSetState<number>();

  // Replays whatever the cashier asked for while this fee was locked, now
  // that the add has settled and resolvedItem gives us a real backend id
  // to act against. Only called from flushAddFeeItem's success path.
  const applyQueuedIntent = (
    feeItemId: number,
    resolvedItem: { id: number; quantity: number },
    currentTransactionId: number,
  ) => {
    const intent = pendingIntentsRef.current[feeItemId];
    if (!intent) return;
    delete pendingIntentsRef.current[feeItemId];

    const realLineItemId = String(resolvedItem.id);

    if (intent.type === "remove") {
      pendingRemovalSet.remove(feeItemId);
      void syncRemoveLineItem(currentTransactionId, realLineItemId);
      return;
    }

    // Already matches what the add itself produced — nothing to sync.
    if (resolvedItem.quantity === intent.quantity) return;
    syncLineItemQuantity(currentTransactionId, realLineItemId, intent.quantity);
  };

  const flushAddFeeItem = async (feeItem: FeeCatalogItem) => {
    const id = feeItem.id;
    const state = getFeeAddState(feeAddStatesRef.current, id);

    // A flush for this fee is already running — it'll pick up whatever
    // accumulates here once it finishes (see the finally block).
    if (state.inFlight) return;

    const quantity = state.pendingCount;
    if (quantity <= 0) return;

    state.pendingCount = 0;
    state.inFlight = true;

    // Declared outside the try so finally can tell success from failure,
    // and so applyQueuedIntent gets a fresh (non-stale) transaction id.
    let resolvedItem: { id: number; quantity: number } | null = null;
    let resolvedTransactionId: number | null = null;

    try {
      const currentTransactionId = await ensureTransaction();
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
      state.inFlight = false;
      // Clicks that landed while this was in flight accumulated on the
      // state — send them now instead of waiting for another debounce
      // window.
      if (state.pendingCount > 0) {
        void runFlushAddFeeItem(feeItem);
      } else {
        pendingFeeSet.remove(id);
        if (resolvedItem && resolvedTransactionId) {
          applyQueuedIntent(id, resolvedItem, resolvedTransactionId);
        } else {
          // The add failed — nothing exists server-side to replay against.
          delete pendingIntentsRef.current[id];
          pendingRemovalSet.remove(id);
        }
      }
    }
  };

  const runFlushAddFeeItem = (feeItem: FeeCatalogItem): Promise<void> => {
    const state = getFeeAddState(feeAddStatesRef.current, feeItem.id);
    const promise = flushAddFeeItem(feeItem).finally(() => {
      if (state.inFlightPromise === promise) {
        state.inFlightPromise = null;
      }
    });
    state.inFlightPromise = promise;
    return promise;
  };

  const addFeeItemImpl = (feeItem: FeeCatalogItem) => {
    // Optimistic: bump the receipt immediately, before the network call
    // resolves, so the UI doesn't lag a click behind the server.
    const optimisticId = `optimistic-${feeItem.id}`;
    setLineItems((current) =>
      addOrIncrementLineItem(current, feeItem, optimisticId),
    );

    // A fresh Add supersedes anything previously queued for this fee
    // (e.g. cashier marked it for removal, then changed their mind).
    delete pendingIntentsRef.current[feeItem.id];
    pendingRemovalSet.remove(feeItem.id);

    pendingFeeSet.add(feeItem.id);

    const state = getFeeAddState(feeAddStatesRef.current, feeItem.id);
    state.pendingCount += 1;

    if (state.flushTimeout) clearTimeout(state.flushTimeout);

    state.flushTimeout = setTimeout(() => {
      state.flushTimeout = null;
      void runFlushAddFeeItem(feeItem);
    }, DEBOUNCE_MS);
  };

  // addFeeItem is called from the fee-catalog side of the UI, which lives
  // in a separate context from the rest of this hook's state (see
  // transaction-builder-context.tsx) — that split only pays off if
  // addFeeItem's identity never changes, otherwise the catalog context
  // would re-render on every receipt-side change anyway. addFeeItemImpl
  // closes over the current render's runFlushAddFeeItem/etc. and is
  // re-assigned to the ref every render, so this indirection is always
  // calling fresh internals despite the wrapper itself never changing.
  const addFeeItemImplRef = useRef(addFeeItemImpl);
  addFeeItemImplRef.current = addFeeItemImpl;
  const addFeeItem = useCallback((feeItem: FeeCatalogItem) => {
    addFeeItemImplRef.current(feeItem);
  }, []);

  // Per-line-item debounce state for quantity edits, keyed by lineItemId.
  const quantityTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const latestRequestedQuantityRef = useRef<Record<string, number>>({});
  // The in-flight PATCH promise for a line's quantity, if any — lets
  // cancel()'s drain loop wait on it the same way it already waits on
  // in-flight adds (via feeAddStatesRef's inFlightPromise).
  const quantityInFlightPromisesRef = useRef<
    Record<string, Promise<void> | null>
  >({});

  // Lines with an outstanding quantity write (scheduled or in-flight) —
  // feeds isSyncing.
  const [pendingQuantityLineItemIds, pendingQuantitySet] =
    useSetState<string>();

  useEffect(() => {
    const timeouts = quantityTimeoutsRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  // Skip clearing if a newer edit already scheduled its own timeout —
  // there's still more work coming for this line.
  const clearQuantityPendingIfSettled = (lineItemId: string) => {
    if (quantityTimeoutsRef.current[lineItemId]) return;
    pendingQuantitySet.remove(lineItemId);
  };

  // Fires the PATCH for a quantity change. No locking decisions here —
  // the caller must have already confirmed it's safe to sync this line.
  const syncLineItemQuantity = (
    currentTransactionId: number,
    lineItemId: string,
    quantity: number,
  ) => {
    latestRequestedQuantityRef.current[lineItemId] = quantity;
    pendingQuantitySet.add(lineItemId);

    const existingTimeout = quantityTimeoutsRef.current[lineItemId];
    if (existingTimeout) clearTimeout(existingTimeout);

    quantityTimeoutsRef.current[lineItemId] = setTimeout(() => {
      delete quantityTimeoutsRef.current[lineItemId];
      const requestedQuantity = latestRequestedQuantityRef.current[lineItemId];

      const promise = updateTransactionItemQuantity(
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
          if (quantityInFlightPromisesRef.current[lineItemId] === promise) {
            delete quantityInFlightPromisesRef.current[lineItemId];
          }
        });

      quantityInFlightPromisesRef.current[lineItemId] = promise;
    }, DEBOUNCE_MS);
  };

  const setLineItemQuantity = (lineItemId: string, quantity: number) => {
    const clamped = Math.max(1, quantity);

    const existingLineItem = lineItems.find((item) => item.id === lineItemId);
    if (existingLineItem && existingLineItem.quantity === clamped) return;

    // Reflect the cashier's intent immediately regardless of lock state.
    setLineItems((current) =>
      setLineItemQuantityInList(current, lineItemId, clamped),
    );

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

  // Fires the DELETE — same "no locking decisions" contract as
  // syncLineItemQuantity above.
  const syncRemoveLineItem = async (
    currentTransactionId: number,
    lineItemId: string,
  ) => {
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

  const removeLineItem = (lineItemId: string) => {
    const targetLineItem = lineItems.find((item) => item.id === lineItemId);

    // Locked lines (no real id yet, or a repeat-add still settling) queue
    // the removal instead of deleting — checked before the transactionId
    // guard below, since a freshly-added optimistic line can be locked
    // while transactionId is still null (ensureTransaction hasn't run
    // yet).
    if (targetLineItem && isLineItemLocked(targetLineItem, pendingFeeItemIds)) {
      pendingIntentsRef.current[targetLineItem.feeItemId] = {
        type: "remove",
      };
      pendingRemovalSet.add(targetLineItem.feeItemId);
      return;
    }

    // A quantity change still debounced (not yet fired) for this line is
    // superseded by removal — the line is going away, so the PATCH it
    // would have sent should never fire.
    const queuedQuantityTimeout = quantityTimeoutsRef.current[lineItemId];
    if (queuedQuantityTimeout) {
      clearTimeout(queuedQuantityTimeout);
      delete quantityTimeoutsRef.current[lineItemId];
      delete latestRequestedQuantityRef.current[lineItemId];
      clearQuantityPendingIfSettled(lineItemId);
    }

    if (!transactionId) return;
    void syncRemoveLineItem(transactionId, lineItemId);
  };

  // Sync, no network call — used after a successful confirm, where
  // there's nothing in flight left to drain (Confirm is gated on
  // isSyncing) and nothing server-side to cancel.
  const reset = () => {
    Object.values(quantityTimeoutsRef.current).forEach(clearTimeout);
    quantityTimeoutsRef.current = {};
    latestRequestedQuantityRef.current = {};
    quantityInFlightPromisesRef.current = {};
    pendingQuantitySet.clear();

    Object.values(feeAddStatesRef.current).forEach((state) => {
      if (state.flushTimeout) clearTimeout(state.flushTimeout);
    });
    feeAddStatesRef.current = {};
    pendingFeeSet.clear();

    pendingIntentsRef.current = {};
    pendingRemovalSet.clear();

    setTransactionId(null);
    setLineItems([]);
  };

  // Not gated on isSyncing (unlike Confirm) — Cancel should feel instant
  // from the caller's side; this resolves internally instead. It resolves
  // the true transaction id (the in-flight initiate promise, since the
  // closure variable can lag) and drains every in-flight add first, so a
  // late response can't resurrect an item after the cashier already
  // cancelled.
  const cancel = async (): Promise<void> => {
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
      (Object.values(feeAddStatesRef.current).some(
        (state) => state.inFlightPromise,
      ) ||
        Object.values(quantityInFlightPromisesRef.current).some(
          (promise) => promise,
        )) &&
      drainRounds < MAX_CANCEL_DRAIN_ROUNDS
    ) {
      const inFlightPromises = [
        ...Object.values(feeAddStatesRef.current)
          .map((state) => state.inFlightPromise)
          .filter((promise): promise is Promise<void> => promise !== null),
        ...Object.values(quantityInFlightPromisesRef.current).filter(
          (promise): promise is Promise<void> => promise !== null,
        ),
      ];
      await Promise.allSettled(inFlightPromises);
      drainRounds += 1;
    }

    if (effectiveTransactionId) {
      await cancelTransaction(effectiveTransactionId);
    }
    reset();
  };

  const isSyncing =
    isInitiating ||
    pendingFeeItemIds.size > 0 ||
    pendingQuantityLineItemIds.size > 0;

  return {
    transactionId,
    lineItems,
    isSyncing,
    pendingFeeItemIds,
    pendingRemovalFeeItemIds,
    addFeeItem,
    setLineItemQuantity,
    removeLineItem,
    cancel,
    reset,
  };
}
