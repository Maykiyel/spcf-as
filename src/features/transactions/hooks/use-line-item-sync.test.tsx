// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLineItemSync } from "./use-line-item-sync";
import { initiateTransaction } from "../api/initiate-transaction";
import { addTransactionItem } from "../api/add-transaction-item";
import { deleteTransactionItem } from "../api/delete-transaction-item";
import { updateTransactionItemQuantity } from "../api/update-transaction-item-quantity";
import { cancelTransaction } from "../api/cancel-transaction";
import { notifyMutationError } from "@/lib/notifications/notifications";
import type {
  FeeCatalogItem,
  InitiatedTransaction,
  TransactionDTO,
  TransactionItemDTO,
} from "../types";

vi.mock("../api/initiate-transaction");
vi.mock("../api/add-transaction-item");
vi.mock("../api/delete-transaction-item");
vi.mock("../api/update-transaction-item-quantity");
vi.mock("../api/cancel-transaction");
vi.mock("@/lib/notifications/notifications");

const mockInitiateTransaction = vi.mocked(initiateTransaction);
const mockAddTransactionItem = vi.mocked(addTransactionItem);
const mockDeleteTransactionItem = vi.mocked(deleteTransactionItem);
const mockUpdateTransactionItemQuantity = vi.mocked(updateTransactionItemQuantity);
const mockCancelTransaction = vi.mocked(cancelTransaction);
const mockNotifyMutationError = vi.mocked(notifyMutationError);

const parkingFee: FeeCatalogItem = {
  id: 2,
  name: "Parking Sticker",
  description: null,
  price: 200,
  itemCode: "PARKING",
};

// --- fixtures & helpers -----------------------------------------------
// Kept file-local rather than promoted to a shared test-utils module —
// only this file needs them today (see CONTEXT.md's `src/api/` note on
// not pre-building shared modules for a single consumer).

function initiatedTransaction(
  overrides: Partial<InitiatedTransaction> = {},
): InitiatedTransaction {
  return {
    id: 1,
    status: "pending",
    cashier: { id: 1, full_name: "Test Cashier" },
    ...overrides,
  };
}

function resolvedItem(
  overrides: Partial<TransactionItemDTO> = {},
): TransactionItemDTO {
  return {
    id: 501,
    name: parkingFee.name,
    price: parkingFee.price,
    quantity: 1,
    subtotal: parkingFee.price,
    ...overrides,
  };
}

// Manual promise control for tests that need to assert on state *between*
// a request firing and it resolving (e.g. "still locked while in flight").
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

// Advances fake time and flushes the resulting microtask chain, wrapped in
// act() so React commits the state updates before the next assertion
// reads them — same helper as transaction-builder-context.test.tsx.
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

// Flushes pending microtasks without advancing fake timers — for
// asserting on the immediate aftermath of a promise resolving.
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

// Starting point most tests need: one settled line item (real id 501,
// quantity 1). Clicks addFeeItem and drives the add-debounce + network
// round trip to completion.
async function renderWithSettledLine() {
  mockInitiateTransaction.mockResolvedValue(initiatedTransaction());
  mockAddTransactionItem.mockResolvedValue(resolvedItem());

  const rendered = renderHook(() => useLineItemSync());
  act(() => rendered.result.current.addFeeItem(parkingFee));
  await advance(400);

  return rendered;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useLineItemSync — initial state", () => {
  it("starts with no transaction, no line items, and not syncing", () => {
    const { result } = renderHook(() => useLineItemSync());

    expect(result.current.transactionId).toBeNull();
    expect(result.current.lineItems).toEqual([]);
    expect(result.current.isSyncing).toBe(false);
    expect(mockInitiateTransaction).not.toHaveBeenCalled();
  });
});

describe("useLineItemSync — addFeeItem", () => {
  it("bumps the draft optimistically, before the debounce fires or any network call happens", () => {
    mockAddTransactionItem.mockReturnValue(deferred<TransactionItemDTO>().promise);

    const { result } = renderHook(() => useLineItemSync());
    act(() => result.current.addFeeItem(parkingFee));

    expect(result.current.lineItems).toEqual([
      expect.objectContaining({ id: "optimistic-2", feeItemId: parkingFee.id, quantity: 1 }),
    ]);
    expect(mockAddTransactionItem).not.toHaveBeenCalled();
  });

  it("initiates a transaction and posts the add once the debounce fires, reconciling to the real id", async () => {
    mockInitiateTransaction.mockResolvedValue(initiatedTransaction());
    mockAddTransactionItem.mockResolvedValue(resolvedItem());

    const { result } = renderHook(() => useLineItemSync());
    act(() => result.current.addFeeItem(parkingFee));
    expect(mockInitiateTransaction).not.toHaveBeenCalled(); // still debouncing

    await advance(400);

    expect(mockAddTransactionItem).toHaveBeenCalledWith(1, {
      service_id: parkingFee.id,
      quantity: 1,
    });
    expect(result.current.transactionId).toBe(1);
    expect(result.current.lineItems[0]).toMatchObject({ id: "501", quantity: 1 });
  });

  it("reverts the optimistic bump and notifies on a failed add", async () => {
    mockInitiateTransaction.mockResolvedValue(initiatedTransaction());
    mockAddTransactionItem.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useLineItemSync());
    act(() => result.current.addFeeItem(parkingFee));
    await advance(400);

    expect(result.current.lineItems).toEqual([]);
    expect(mockNotifyMutationError).toHaveBeenCalledWith(
      expect.any(Error),
      "Couldn't add that fee. Please try again.",
    );
  });

  it("only reverts the failed batch's own quantity, not a later successful add on the same fee", async () => {
    mockInitiateTransaction.mockResolvedValue(initiatedTransaction());
    mockAddTransactionItem
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(resolvedItem());

    const { result } = renderHook(() => useLineItemSync());

    act(() => result.current.addFeeItem(parkingFee));
    await advance(400);
    expect(result.current.lineItems).toEqual([]); // first batch's failure fully reverted

    act(() => result.current.addFeeItem(parkingFee));
    await advance(400);

    expect(result.current.lineItems).toEqual([
      expect.objectContaining({ id: "501", quantity: 1 }),
    ]);
  });

  it("requeues clicks that land while a flush is already in flight, instead of dropping or racing them", async () => {
    mockInitiateTransaction.mockResolvedValue(initiatedTransaction());
    const firstAdd = deferred<TransactionItemDTO>();
    mockAddTransactionItem
      .mockImplementationOnce(() => firstAdd.promise)
      .mockResolvedValueOnce(resolvedItem());

    const { result } = renderHook(() => useLineItemSync());

    act(() => result.current.addFeeItem(parkingFee));
    await advance(400);
    expect(mockAddTransactionItem).toHaveBeenCalledTimes(1); // in flight, blocked on firstAdd

    act(() => result.current.addFeeItem(parkingFee)); // second click lands mid-flight
    await advance(400);
    expect(mockAddTransactionItem).toHaveBeenCalledTimes(1); // guarded — no second request yet

    firstAdd.resolve(resolvedItem());
    await flush();

    // The finally block notices the second click's accumulated count and
    // fires a follow-up request immediately, without another debounce wait.
    expect(mockAddTransactionItem).toHaveBeenNthCalledWith(2, 1, {
      service_id: parkingFee.id,
      quantity: 1,
    });
  });
});

describe("useLineItemSync — setLineItemQuantity", () => {
  it("reflects the new quantity immediately, then PATCHes it once the debounce fires", async () => {
    mockUpdateTransactionItemQuantity.mockResolvedValue(resolvedItem({ quantity: 5, subtotal: 1000 }));

    const { result } = await renderWithSettledLine();
    act(() => result.current.setLineItemQuantity("501", 5));

    expect(result.current.lineItems[0].quantity).toBe(5); // reflected before the PATCH fires
    expect(mockUpdateTransactionItemQuantity).not.toHaveBeenCalled();

    await advance(400);

    expect(mockUpdateTransactionItemQuantity).toHaveBeenCalledWith(1, 501, 5);
  });

  it("notifies when the PATCH fails", async () => {
    mockUpdateTransactionItemQuantity.mockRejectedValue(new Error("network error"));

    const { result } = await renderWithSettledLine();
    act(() => result.current.setLineItemQuantity("501", 5));
    await advance(400);

    expect(mockNotifyMutationError).toHaveBeenCalledWith(
      expect.any(Error),
      "Couldn't update that item's quantity. Please try again.",
    );
  });
});

describe("useLineItemSync — removeLineItem", () => {
  it("removes the row immediately and sends the DELETE", async () => {
    mockDeleteTransactionItem.mockResolvedValue(undefined);

    const { result } = await renderWithSettledLine();
    act(() => result.current.removeLineItem("501"));
    await flush();

    expect(result.current.lineItems).toEqual([]);
    expect(mockDeleteTransactionItem).toHaveBeenCalledWith(1, 501);
  });

  it("restores the row and notifies if the DELETE fails", async () => {
    mockDeleteTransactionItem.mockRejectedValue(new Error("network error"));

    const { result } = await renderWithSettledLine();
    act(() => result.current.removeLineItem("501"));
    await flush();

    expect(result.current.lineItems).toEqual([
      expect.objectContaining({ id: "501" }),
    ]);
    expect(mockNotifyMutationError).toHaveBeenCalledWith(
      expect.any(Error),
      "Couldn't remove that item. Please try again.",
    );
  });

  it("cancels a quantity change still debounced when the line is removed — the PATCH never fires", async () => {
    mockDeleteTransactionItem.mockResolvedValue(undefined);

    const { result } = await renderWithSettledLine();
    act(() => result.current.setLineItemQuantity("501", 5));
    expect(mockUpdateTransactionItemQuantity).not.toHaveBeenCalled();

    act(() => result.current.removeLineItem("501"));
    await advance(400); // the quantity debounce window that would have fired

    expect(mockUpdateTransactionItemQuantity).not.toHaveBeenCalled();
    expect(mockDeleteTransactionItem).toHaveBeenCalledWith(1, 501);
  });
});

// A line stays "locked" — no real backend id yet, or its fee's repeat-add
// hasn't settled — while an add is scheduled or in flight. Actions on a
// locked line queue an intent instead of acting immediately; the intent
// replays once the add resolves with a real id.
describe("useLineItemSync — deferred intent on a locked line", () => {
  it("queues a remove clicked before the add's debounce has even fired", () => {
    mockAddTransactionItem.mockReturnValue(deferred<TransactionItemDTO>().promise);

    const { result } = renderHook(() => useLineItemSync());
    act(() => result.current.addFeeItem(parkingFee));
    // No advance() yet — transactionId is still null, so this exercises
    // the case where removeLineItem must check "is this locked?" before
    // its "!transactionId" guard, not after.
    act(() => result.current.removeLineItem("optimistic-2"));

    expect(result.current.pendingRemovalFeeItemIds.has(parkingFee.id)).toBe(true);
    expect(result.current.lineItems[0]?.id).toBe("optimistic-2");
    expect(mockDeleteTransactionItem).not.toHaveBeenCalled();
  });

  it("queues a remove clicked while the add is in flight, then replays it against the real id once it settles", async () => {
    mockInitiateTransaction.mockResolvedValue(initiatedTransaction());
    mockDeleteTransactionItem.mockResolvedValue(undefined);
    const add = deferred<TransactionItemDTO>();
    mockAddTransactionItem.mockReturnValue(add.promise);

    const { result } = renderHook(() => useLineItemSync());
    act(() => result.current.addFeeItem(parkingFee));
    await advance(400);

    act(() => result.current.removeLineItem("optimistic-2"));
    expect(mockDeleteTransactionItem).not.toHaveBeenCalled(); // no real id to delete yet

    add.resolve(resolvedItem());
    await flush();

    // Replayed against the real id (501), not Number("optimistic-2") (NaN).
    expect(mockDeleteTransactionItem).toHaveBeenCalledWith(1, 501);
    expect(result.current.pendingRemovalFeeItemIds.has(parkingFee.id)).toBe(false);
  });

  it("queues a quantity change clicked while the add is in flight, then replays it against the real id and target quantity", async () => {
    mockInitiateTransaction.mockResolvedValue(initiatedTransaction());
    mockUpdateTransactionItemQuantity.mockResolvedValue(resolvedItem({ quantity: 5, subtotal: 1000 }));
    const add = deferred<TransactionItemDTO>();
    mockAddTransactionItem.mockReturnValue(add.promise);

    const { result } = renderHook(() => useLineItemSync());
    act(() => result.current.addFeeItem(parkingFee));
    await advance(400);

    act(() => result.current.setLineItemQuantity("optimistic-2", 5));
    expect(result.current.lineItems[0]?.quantity).toBe(5); // shown immediately, PATCH deferred
    expect(mockUpdateTransactionItemQuantity).not.toHaveBeenCalled();

    add.resolve(resolvedItem()); // the add itself only established quantity 1
    await flush();
    await advance(400); // the replay's own debounce

    // Replayed against the real id and the queued target (5), not the
    // quantity the add itself produced (1).
    expect(mockUpdateTransactionItemQuantity).toHaveBeenCalledWith(1, 501, 5);
  });

  it("clears a queued removal if the cashier clicks Add again before it replays", async () => {
    mockInitiateTransaction.mockResolvedValue(initiatedTransaction());
    const add = deferred<TransactionItemDTO>();
    mockAddTransactionItem.mockReturnValue(add.promise);

    const { result } = renderHook(() => useLineItemSync());
    act(() => result.current.addFeeItem(parkingFee));
    await advance(400);

    act(() => result.current.removeLineItem("optimistic-2"));
    expect(result.current.pendingRemovalFeeItemIds.has(parkingFee.id)).toBe(true);

    act(() => result.current.addFeeItem(parkingFee)); // changed their mind
    expect(result.current.pendingRemovalFeeItemIds.has(parkingFee.id)).toBe(false);

    add.resolve(resolvedItem());
    await flush();

    expect(mockDeleteTransactionItem).not.toHaveBeenCalled();
  });
});

describe("useLineItemSync — cancel", () => {
  const fakeCancelledTransaction: TransactionDTO = {
    control_id: 1,
    cashier: { id: 1, full_name: "Test Cashier" },
    series_number: 1,
    customer_name: null,
    items: [],
    total: 0,
    amount_paid: 0,
    change_amount: 0,
    status: "cancelled",
    date: "2026-08-21T06:30:00.000000Z",
  };

  it("cancels a settled transaction and clears the draft", async () => {
    mockCancelTransaction.mockResolvedValue(fakeCancelledTransaction);

    const { result } = await renderWithSettledLine();
    await act(() => result.current.cancel());

    expect(mockCancelTransaction).toHaveBeenCalledWith(1);
    expect(result.current.transactionId).toBeNull();
    expect(result.current.lineItems).toEqual([]);
  });

  it("waits for an in-flight initiate to resolve before cancelling", async () => {
    const initiate = deferred<InitiatedTransaction>();
    mockInitiateTransaction.mockReturnValue(initiate.promise);
    mockAddTransactionItem.mockResolvedValue(resolvedItem());
    mockCancelTransaction.mockResolvedValue(fakeCancelledTransaction);

    const { result } = renderHook(() => useLineItemSync());
    act(() => result.current.addFeeItem(parkingFee));
    await advance(400);
    expect(result.current.transactionId).toBeNull(); // initiate still in flight

    const cancelling = act(() => result.current.cancel());
    initiate.resolve(initiatedTransaction());
    await cancelling;

    expect(mockCancelTransaction).toHaveBeenCalledWith(1);
  });

  it("does not call cancelTransaction when no backend transaction was ever created", async () => {
    const { result } = renderHook(() => useLineItemSync());
    await act(() => result.current.cancel());

    expect(mockCancelTransaction).not.toHaveBeenCalled();
  });

  it("drains an in-flight quantity PATCH before cancelling, the same way it already waits on in-flight adds", async () => {
    const quantityUpdate = deferred<TransactionItemDTO>();
    mockUpdateTransactionItemQuantity.mockReturnValue(quantityUpdate.promise);
    mockCancelTransaction.mockResolvedValue(fakeCancelledTransaction);

    const { result } = await renderWithSettledLine();
    act(() => result.current.setLineItemQuantity("501", 5));
    await advance(400); // fires the PATCH — now in flight

    const cancelling = act(() => result.current.cancel());
    expect(mockCancelTransaction).not.toHaveBeenCalled(); // still draining

    quantityUpdate.resolve(resolvedItem({ quantity: 5, subtotal: 1000 }));
    await cancelling;

    expect(mockCancelTransaction).toHaveBeenCalledWith(1);
  });
});

describe("useLineItemSync — reset", () => {
  it("clears the draft synchronously without calling any API", async () => {
    const { result } = await renderWithSettledLine();
    act(() => result.current.reset());

    expect(result.current.transactionId).toBeNull();
    expect(result.current.lineItems).toEqual([]);
    expect(mockCancelTransaction).not.toHaveBeenCalled();
    expect(mockDeleteTransactionItem).not.toHaveBeenCalled();
  });

  it("cancels a pending debounced quantity sync so it can't fire afterwards", async () => {
    const { result } = await renderWithSettledLine();

    act(() => result.current.setLineItemQuantity("501", 5));
    act(() => result.current.reset());
    await advance(400); // if the old timer still fired, this would PATCH against a stale transaction

    expect(mockUpdateTransactionItemQuantity).not.toHaveBeenCalled();
  });
});

describe("useLineItemSync — isSyncing", () => {
  it("is true while initiate is in flight, false again once it settles", async () => {
    const initiate = deferred<InitiatedTransaction>();
    mockInitiateTransaction.mockReturnValue(initiate.promise);
    mockAddTransactionItem.mockResolvedValue(resolvedItem());

    const { result } = renderHook(() => useLineItemSync());
    act(() => result.current.addFeeItem(parkingFee));
    await advance(400);
    expect(result.current.isSyncing).toBe(true);

    initiate.resolve(initiatedTransaction());
    await flush();

    expect(result.current.isSyncing).toBe(false);
  });

  it("is true while a quantity PATCH is scheduled or in flight", async () => {
    mockUpdateTransactionItemQuantity.mockResolvedValue(resolvedItem({ quantity: 5, subtotal: 1000 }));

    const { result } = await renderWithSettledLine();
    act(() => result.current.setLineItemQuantity("501", 5));
    expect(result.current.isSyncing).toBe(true);

    await advance(400);

    expect(result.current.isSyncing).toBe(false);
  });
});

describe("useLineItemSync — unmount cleanup", () => {
  it("clears a pending add-debounce timer on unmount", async () => {
    const { result, unmount } = renderHook(() => useLineItemSync());
    act(() => result.current.addFeeItem(parkingFee));
    unmount();
    await advance(400);

    expect(mockAddTransactionItem).not.toHaveBeenCalled();
  });

  it("clears a pending quantity-debounce timer on unmount", async () => {
    mockUpdateTransactionItemQuantity.mockResolvedValue(resolvedItem({ quantity: 5, subtotal: 1000 }));

    const { result, unmount } = await renderWithSettledLine();
    act(() => result.current.setLineItemQuantity("501", 5));
    unmount();
    await advance(400);

    expect(mockUpdateTransactionItemQuantity).not.toHaveBeenCalled();
  });
});