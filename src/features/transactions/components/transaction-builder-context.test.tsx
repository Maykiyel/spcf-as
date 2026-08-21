// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render";
import { TransactionBuilderProvider } from "./transaction-builder-context";
import { useTransactionBuilder } from "./use-transaction-builder";
import { initiateTransaction } from "../api/initiate-transaction";
import { addTransactionItem } from "../api/add-transaction-item";
import { deleteTransactionItem } from "../api/delete-transaction-item";
import { updateTransactionItemQuantity } from "../api/update-transaction-item-quantity";
import type { FeeCatalogItem, TransactionItemDTO } from "../types";

vi.mock("../api/initiate-transaction");
vi.mock("../api/add-transaction-item");
vi.mock("../api/delete-transaction-item");
vi.mock("../api/update-transaction-item-quantity");
vi.mock("../api/save-transaction");
vi.mock("../api/cancel-transaction");

const mockInitiateTransaction = vi.mocked(initiateTransaction);
const mockAddTransactionItem = vi.mocked(addTransactionItem);
const mockDeleteTransactionItem = vi.mocked(deleteTransactionItem);
const mockUpdateTransactionItemQuantity = vi.mocked(
  updateTransactionItemQuantity,
);

const parkingFee: FeeCatalogItem = {
  id: 2,
  name: "Parking Sticker",
  description: null,
  price: 200,
  itemCode: "PARKING",
};

// Minimal harness exposing just enough of the context to drive and
// observe the scenarios below, rather than going through the full page
// (search, filters, etc.) — the seam under test is the context's public
// interface, not the surrounding UI.
function Harness() {
  const { state, actions, meta } = useTransactionBuilder();
  const line = state.lineItems.find((item) => item.feeItemId === parkingFee.id);

  return (
    <div>
      <button onClick={() => actions.addFeeItem(parkingFee)}>add</button>
      {line && (
        <button onClick={() => actions.removeLineItem(line.id)}>remove</button>
      )}
      {line && (
        <button onClick={() => actions.setLineItemQuantity(line.id, 5)}>
          set-quantity-5
        </button>
      )}
      <span data-testid="line-id">{line?.id ?? "none"}</span>
      <span data-testid="line-quantity">{line?.quantity ?? "none"}</span>
      <span data-testid="pending-removal">
        {meta.pendingRemovalFeeItemIds.has(parkingFee.id) ? "yes" : "no"}
      </span>
    </div>
  );
}

function renderHarness() {
  return renderWithQueryClient(
    <TransactionBuilderProvider catalogOverride={[parkingFee]}>
      <Harness />
    </TransactionBuilderProvider>,
  );
}

// Advances fake time and flushes the resulting microtask chain, wrapped
// in act() so React actually commits whatever state updates that chain
// triggers before the next assertion/interaction reads them. Plain
// vi.advanceTimersByTimeAsync() without this wrapping left transactionId
// (etc.) stale in the next click's closure — the state update had
// happened, but React hadn't re-rendered to reflect it yet.
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mockInitiateTransaction.mockResolvedValue({
    id: 1,
    status: "pending",
    cashier: { id: 1, full_name: "Test Cashier" },
  });
  mockDeleteTransactionItem.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("TransactionBuilderProvider — deferred intent on a locked line", () => {
  it("queues a remove clicked before the add's debounce has even fired (transactionId still null)", async () => {
    mockAddTransactionItem.mockReturnValue(
      new Promise(() => {
        /* never resolves within this test — irrelevant, we never advance
           past the point where it would even be called */
      }),
    );

    renderHarness();

    fireEvent.click(screen.getByText("add"));
    // No advance() at all yet: the 400ms add-debounce hasn't fired, so
    // ensureTransaction() has never run and transactionId is still null.
    // Clicking remove here used to hit removeLineItem's `!transactionId`
    // early return before the lock check ever ran, silently dropping the
    // click instead of queuing it.
    fireEvent.click(screen.getByText("remove"));

    expect(screen.getByTestId("pending-removal").textContent).toBe("yes");
    expect(screen.getByTestId("line-id").textContent).toBe("optimistic-2");
  });

  it("queues a remove clicked while the add is still in flight, then actually fires it once the add settles", async () => {
    let resolveAdd!: (item: TransactionItemDTO) => void;
    mockAddTransactionItem.mockReturnValue(
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
    );

    renderHarness();

    fireEvent.click(screen.getByText("add"));

    // Optimistic bump is immediate — the line exists locally right away,
    // on its client-only id, before any network call has even fired.
    expect(screen.getByTestId("line-id").textContent).toBe("optimistic-2");

    // Let the add-flush's debounce timer fire, which kicks off
    // ensureTransaction() -> initiateTransaction() -> addTransactionItem().
    await advance(400);
    expect(mockAddTransactionItem).toHaveBeenCalledTimes(1);

    // The add hasn't resolved yet — this line is still locked. Removing
    // it now should NOT fire a DELETE (there's no real id to delete
    // against yet); it should queue the intent instead.
    fireEvent.click(screen.getByText("remove"));

    expect(mockDeleteTransactionItem).not.toHaveBeenCalled();
    expect(screen.getByTestId("pending-removal").textContent).toBe("yes");
    // The line is still present — a queued remove doesn't optimistically
    // vanish the row, since we'd lose track of the real id to delete
    // once one exists. It just renders differently (see
    // ReceiptLineItemRow's pendingRemoval prop).
    expect(screen.getByTestId("line-id").textContent).toBe("optimistic-2");

    // Now the add resolves with a real backend id — resolve outside act(),
    // then flush inside advance() so the resulting .then/finally chain
    // (including the queued removal it triggers) runs to completion.
    resolveAdd({
      id: 501,
      name: parkingFee.name,
      price: parkingFee.price,
      quantity: 1,
      subtotal: parkingFee.price,
    });
    await advance(0);

    // The queued removal replayed against the REAL id (501), not the
    // client-only placeholder — this is the whole point: the intent
    // queue exists specifically so this call can't be Number("optimistic-2")
    // (NaN).
    expect(mockDeleteTransactionItem).toHaveBeenCalledTimes(1);
    expect(mockDeleteTransactionItem).toHaveBeenCalledWith(1, 501);
    expect(screen.getByTestId("pending-removal").textContent).toBe("no");
  });

  it("queues a quantity change clicked while the add is still in flight, then replays it once the add settles", async () => {
    let resolveAdd!: (item: TransactionItemDTO) => void;
    mockAddTransactionItem.mockReturnValue(
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
    );
    mockUpdateTransactionItemQuantity.mockResolvedValue({
      id: 501,
      name: parkingFee.name,
      price: parkingFee.price,
      quantity: 5,
      subtotal: parkingFee.price * 5,
    });

    renderHarness();

    fireEvent.click(screen.getByText("add"));
    await advance(400);
    expect(mockAddTransactionItem).toHaveBeenCalledTimes(1);

    // Still locked — setting quantity to 5 should update the local
    // display immediately but defer the actual PATCH.
    fireEvent.click(screen.getByText("set-quantity-5"));
    expect(screen.getByTestId("line-quantity").textContent).toBe("5");
    expect(mockUpdateTransactionItemQuantity).not.toHaveBeenCalled();

    resolveAdd({
      id: 501,
      name: parkingFee.name,
      price: parkingFee.price,
      quantity: 1, // the add itself only established quantity 1
      subtotal: parkingFee.price,
    });
    // Flush the add's resolution (which queues the replay), then the
    // replay's own debounce (syncLineItemQuantity schedules through the
    // same DEBOUNCE_MS path as a normal quantity edit).
    await advance(0);
    await advance(400);

    expect(mockUpdateTransactionItemQuantity).toHaveBeenCalledTimes(1);
    // Replayed against the real id (501) and the queued target quantity
    // (5), not the quantity the add itself produced (1).
    expect(mockUpdateTransactionItemQuantity).toHaveBeenCalledWith(1, 501, 5);
  });
});
