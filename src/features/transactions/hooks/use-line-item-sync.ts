import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
} from "../lib/transaction-draft";
import { createWriteQueue } from "../lib/write-queue";
import type {
  FeeCatalogItem,
  PendingLineItemIntent,
  DraftLineItem,
} from "../types";

// Debounce window for coalescing rapid add clicks into fewer network
// calls. Matches the debounce used elsewhere in the app.
const DEBOUNCE_MS = 400;

// What a fee add coalesces: clicks accumulate into one quantity, and the
// guard keeps a second flush off the wire while the first is out.
type FeeAddState = {
  pendingCount: number;
  inFlight: boolean;
};

// Lazy state init rather than a ref, because a queue must be built once and
// this module deliberately never mutates a ref during render.
function usePendingWriteQueue<K>() {
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<K>>(
    () => new Set(),
  );
  const [queue] = useState(() =>
    createWriteQueue<K>({
      debounceMs: DEBOUNCE_MS,
      onPendingChange: setPendingKeys,
    }),
  );

  return [pendingKeys, queue] as const;
}

function getFeeAddState(
  states: Record<number, FeeAddState>,
  feeItemId: number,
): FeeAddState {
  const existing = states[feeItemId];
  if (existing) return existing;

  const created: FeeAddState = { pendingCount: 0, inFlight: false };
  states[feeItemId] = created;
  return created;
}

// Owns the transaction lifecycle too, not just line items: cancel() needs
// add-draining and id resolution together, and splitting them recreates
// the ref coupling that caused the remove-on-a-locked-line bug.
export function useLineItemSync() {
  const [transactionId, setTransactionId] = useState<number | null>(null);
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);

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

  // Add-fee coalescing state, keyed by feeItemId (the service id). The
  // timers, in-flight promises and pending set live in feeQueue below.
  const feeAddStatesRef = useRef<Record<number, FeeAddState>>({});

  // Fees with outstanding add activity (scheduled or in-flight) — feeds
  // isLineItemLocked and isSyncing.
  const [pendingFeeItemIds, feeQueue] = usePendingWriteQueue<number>();

  // The newest quantity asked for per line — a quantity edit coalesces by
  // replacing, where a fee add accumulates.
  const latestRequestedQuantityRef = useRef<Record<string, number>>({});

  // Lines with an outstanding quantity write (scheduled or in-flight) —
  // feeds isSyncing.
  const [pendingQuantityLineItemIds, quantityQueue] =
    usePendingWriteQueue<string>();

  useEffect(() => {
    return () => {
      feeQueue.reset();
      quantityQueue.reset();
    };
  }, [feeQueue, quantityQueue]);

  // What the cashier asked for on a line that was locked at the time,
  // keyed by feeItemId — replayed once that fee settles.
  const pendingIntentsRef = useRef<Record<number, PendingLineItemIntent>>({});

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
      // Re-firing here, before the queue clears this key, is what keeps the
      // fee continuously pending across the two flushes. Another debounce
      // window would strand the clicks that accumulated while in flight.
      if (state.pendingCount > 0) {
        feeQueue.flushNow(id, () => flushAddFeeItem(feeItem));
      } else if (resolvedItem && resolvedTransactionId) {
        applyQueuedIntent(id, resolvedItem, resolvedTransactionId);
      } else {
        // The add failed — nothing exists server-side to replay against.
        delete pendingIntentsRef.current[id];
        pendingRemovalSet.remove(id);
      }
    }
  };

  const addFeeItemImpl = (feeItem: FeeCatalogItem) => {
    // Optimistic: bump the draft immediately, before the network call
    // resolves, so the UI doesn't lag a click behind the server.
    const optimisticId = `optimistic-${feeItem.id}`;
    setLineItems((current) =>
      addOrIncrementLineItem(current, feeItem, optimisticId),
    );

    // A fresh Add supersedes anything previously queued for this fee
    // (e.g. cashier marked it for removal, then changed their mind).
    delete pendingIntentsRef.current[feeItem.id];
    pendingRemovalSet.remove(feeItem.id);

    const state = getFeeAddState(feeAddStatesRef.current, feeItem.id);
    state.pendingCount += 1;

    feeQueue.schedule(feeItem.id, () => flushAddFeeItem(feeItem));
  };

  // Fires the PATCH for a quantity change. No locking decisions here —
  // the caller must have already confirmed it's safe to sync this line.
  const syncLineItemQuantity = (
    currentTransactionId: number,
    lineItemId: string,
    quantity: number,
  ) => {
    latestRequestedQuantityRef.current[lineItemId] = quantity;

    quantityQueue.schedule(lineItemId, async () => {
      const requestedQuantity = latestRequestedQuantityRef.current[lineItemId];

      try {
        const item = await updateTransactionItemQuantity(
          currentTransactionId,
          Number(lineItemId),
          requestedQuantity,
        );
        // A newer change superseded this request while it was in flight —
        // drop the response rather than clobber the newer (already-sent or
        // still-debouncing) value.
        if (
          latestRequestedQuantityRef.current[lineItemId] !== requestedQuantity
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
      } catch (error) {
        notifyMutationError(
          error,
          "Couldn't update that item's quantity. Please try again.",
        );
      }
    });
  };

  const setLineItemQuantityImpl = (lineItemId: string, quantity: number) => {
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

  const removeLineItemImpl = (lineItemId: string) => {
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
    if (quantityQueue.cancel(lineItemId)) {
      delete latestRequestedQuantityRef.current[lineItemId];
    }

    if (!transactionId) return;
    void syncRemoveLineItem(transactionId, lineItemId);
  };

  // Sync, no network call — used after a successful confirm, where
  // there's nothing in flight left to drain (Confirm is gated on
  // isSyncing) and nothing server-side to cancel.
  const resetImpl = () => {
    quantityQueue.reset();
    latestRequestedQuantityRef.current = {};

    feeQueue.reset();
    feeAddStatesRef.current = {};

    pendingIntentsRef.current = {};
    pendingRemovalSet.clear();

    setTransactionId(null);
    setLineItems([]);
  };

  // Not gated on isSyncing (unlike Confirm) — Cancel should feel instant
  // from the caller's side; this resolves internally instead. It resolves
  // the true transaction id (the in-flight initiate promise, since the
  // closure variable can lag) and drains every in-flight write first, so a
  // late response can't resurrect an item after the cashier already
  // cancelled.
  const cancelImpl = async (): Promise<void> => {
    let effectiveTransactionId = transactionId;

    if (!effectiveTransactionId && initiatingRef.current) {
      try {
        effectiveTransactionId = await initiatingRef.current;
      } catch {
        // Initiate itself failed — nothing was ever created server-side.
        effectiveTransactionId = null;
      }
    }

    await Promise.all([feeQueue.drain(), quantityQueue.drain()]);

    if (effectiveTransactionId) {
      await cancelTransaction(effectiveTransactionId);
    }
    resetImpl();
  };

  // Latest-ref pattern: keeps these five callbacks permanently stable
  // (never change identity) while always running the current render's
  // logic. Needed for the CatalogBuilder/TransactionDraft context split in
  // transaction-builder-context.tsx to actually reduce re-renders.
  // Refs update in an effect, not during render, since mutating a ref in
  // render breaks React's rules and disables compiler optimization.
  const addFeeItemImplRef = useRef(addFeeItemImpl);
  const setLineItemQuantityImplRef = useRef(setLineItemQuantityImpl);
  const removeLineItemImplRef = useRef(removeLineItemImpl);
  const cancelImplRef = useRef(cancelImpl);
  const resetImplRef = useRef(resetImpl);

  useLayoutEffect(() => {
    addFeeItemImplRef.current = addFeeItemImpl;
    setLineItemQuantityImplRef.current = setLineItemQuantityImpl;
    removeLineItemImplRef.current = removeLineItemImpl;
    cancelImplRef.current = cancelImpl;
    resetImplRef.current = resetImpl;
  });

  const addFeeItem = useCallback((feeItem: FeeCatalogItem) => {
    addFeeItemImplRef.current(feeItem);
  }, []);

  const setLineItemQuantity = useCallback(
    (lineItemId: string, quantity: number) => {
      setLineItemQuantityImplRef.current(lineItemId, quantity);
    },
    [],
  );

  const removeLineItem = useCallback((lineItemId: string) => {
    removeLineItemImplRef.current(lineItemId);
  }, []);

  const cancel = useCallback((): Promise<void> => {
    return cancelImplRef.current();
  }, []);

  const reset = useCallback(() => {
    resetImplRef.current();
  }, []);

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
