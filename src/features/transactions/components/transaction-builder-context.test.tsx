// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render";
import { TransactionBuilderProvider } from "./transaction-builder-context";
import { useCatalogBuilder } from "./use-catalog-builder";
import { useReceiptBuilder } from "./use-receipt-builder";
import { initiateTransaction } from "../api/initiate-transaction";
import { addTransactionItem } from "../api/add-transaction-item";
import { saveTransaction } from "../api/save-transaction";
import { cancelTransaction } from "../api/cancel-transaction";
import { notifySuccess, notifyMutationError } from "@/lib/notifications/notifications";
import type { FeeCatalogItem, TransactionDTO } from "../types";

// This suite covers only what TransactionBuilderProvider adds on top of
// useLineItemSync — confirmTransaction/cancelReceipt orchestration and the
// canConfirm/missingRequirements composition. Line-item add/remove/quantity
// and locked-line behavior are the hook's own contract and are covered by
// use-line-item-sync.test.tsx, not re-tested here.

vi.mock("../api/initiate-transaction");
vi.mock("../api/add-transaction-item");
vi.mock("../api/save-transaction");
vi.mock("../api/cancel-transaction");
vi.mock("@/lib/notifications/notifications");

const mockInitiateTransaction = vi.mocked(initiateTransaction);
const mockAddTransactionItem = vi.mocked(addTransactionItem);
const mockSaveTransaction = vi.mocked(saveTransaction);
const mockCancelTransaction = vi.mocked(cancelTransaction);
const mockNotifySuccess = vi.mocked(notifySuccess);
const mockNotifyMutationError = vi.mocked(notifyMutationError);

const parkingFee: FeeCatalogItem = {
  id: 2,
  name: "Parking Sticker",
  description: null,
  price: 200,
  itemCode: "PARKING",
};

const fakeCompletedTransaction: TransactionDTO = {
  control_id: 1,
  cashier: { id: 1, full_name: "Test Cashier" },
  series_number: 42,
  customer_name: "Juan Dela Cruz",
  items: [],
  total: 200,
  amount_paid: 200,
  change_amount: 0,
  status: "completed",
  date: "2026-08-21",
};

// Minimal harness exposing just enough of the context to drive and observe
// confirm/cancel — the seam under test is the context's public interface,
// not the surrounding page UI.
function Harness({
  onConfirmSuccess,
}: {
  onConfirmSuccess?: (transaction: TransactionDTO) => void;
}) {
  // addFeeItem is a catalog action (it's how FeeCatalogPanel adds to the
  // receipt); everything else under test here is receipt-side.
  const { actions: catalogActions } = useCatalogBuilder();
  const { state, actions, meta } = useReceiptBuilder();

  return (
    <div>
      <button onClick={() => catalogActions.addFeeItem(parkingFee)}>
        add
      </button>
      <button onClick={() => actions.setPayerName("Juan Dela Cruz")}>
        set-payer
      </button>
      <button onClick={() => actions.setAmountPaid(200)}>set-amount</button>
      <button onClick={() => void actions.confirmTransaction(onConfirmSuccess)}>
        confirm
      </button>
      <button onClick={() => void actions.cancelReceipt()}>cancel</button>
      <span data-testid="payer-name">{state.payerName}</span>
      <span data-testid="can-confirm">{meta.canConfirm ? "yes" : "no"}</span>
      <span data-testid="missing">{meta.missingRequirements.join(", ")}</span>
      <span data-testid="line-count">{state.lineItems.length}</span>
    </div>
  );
}

function renderHarness(
  onConfirmSuccess?: (transaction: TransactionDTO) => void,
) {
  return renderWithQueryClient(
    <TransactionBuilderProvider catalogOverride={[parkingFee]}>
      <Harness onConfirmSuccess={onConfirmSuccess} />
    </TransactionBuilderProvider>,
  );
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

// Adds one settled line item and fills in payer/amount, so confirm/cancel
// tests start from a state that's actually confirmable.
async function readyToConfirm(
  onConfirmSuccess?: (transaction: TransactionDTO) => void,
) {
  renderHarness(onConfirmSuccess);
  fireEvent.click(screen.getByText("add"));
  await advance(400); // add-debounce -> initiate -> addTransactionItem
  fireEvent.click(screen.getByText("set-payer"));
  fireEvent.click(screen.getByText("set-amount"));
}

beforeEach(() => {
  vi.useFakeTimers();
  mockInitiateTransaction.mockResolvedValue({
    id: 1,
    status: "pending",
    cashier: { id: 1, full_name: "Test Cashier" },
  });
  mockAddTransactionItem.mockResolvedValue({
    id: 501,
    name: parkingFee.name,
    price: parkingFee.price,
    quantity: 1,
    subtotal: parkingFee.price,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("TransactionBuilderProvider — canConfirm / missingRequirements", () => {
  it("is not confirmable until payer name, an item, and enough amount paid are all present", async () => {
    renderHarness();

    expect(screen.getByTestId("can-confirm").textContent).toBe("no");
    expect(screen.getByTestId("missing").textContent).toBe(
      "Payer Name, At least 1 item",
    );

    fireEvent.click(screen.getByText("add"));
    await advance(400);
    fireEvent.click(screen.getByText("set-payer"));
    fireEvent.click(screen.getByText("set-amount"));

    expect(screen.getByTestId("can-confirm").textContent).toBe("yes");
    expect(screen.getByTestId("missing").textContent).toBe("");
  });

  it("blocks confirm while the receipt is still syncing, even if otherwise complete", async () => {
    renderHarness();
    fireEvent.click(screen.getByText("set-payer"));
    fireEvent.click(screen.getByText("set-amount"));
    fireEvent.click(screen.getByText("add")); // debounce hasn't fired — still syncing

    expect(screen.getByTestId("can-confirm").textContent).toBe("no");
    expect(screen.getByTestId("missing").textContent).toContain(
      "Still syncing",
    );
  });
});

describe("TransactionBuilderProvider — confirmTransaction", () => {
  it("saves with the trimmed payer name and amount, then resets the receipt on success", async () => {
    mockSaveTransaction.mockResolvedValue(fakeCompletedTransaction);
    await readyToConfirm();

    await act(async () => {
      fireEvent.click(screen.getByText("confirm"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSaveTransaction).toHaveBeenCalledWith(1, {
      customer_name: "Juan Dela Cruz",
      amount_paid: 200,
    });
    expect(mockNotifySuccess).toHaveBeenCalledWith(
      "Transaction completed — Receipt #42.",
    );
    expect(screen.getByTestId("payer-name").textContent).toBe("");
    expect(screen.getByTestId("line-count").textContent).toBe("0");
  });

  it("notifies and leaves the receipt untouched if the save fails", async () => {
    mockSaveTransaction.mockRejectedValue(new Error("network error"));
    await readyToConfirm();

    await act(async () => {
      fireEvent.click(screen.getByText("confirm"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockNotifyMutationError).toHaveBeenCalledWith(
      expect.any(Error),
      "Couldn't complete the transaction. Please try again.",
    );
    expect(screen.getByTestId("payer-name").textContent).toBe("Juan Dela Cruz");
    expect(screen.getByTestId("line-count").textContent).toBe("1");
  });

  it("calls onSuccess with the saved transaction once the save resolves", async () => {
    mockSaveTransaction.mockResolvedValue(fakeCompletedTransaction);
    const onConfirmSuccess = vi.fn();
    await readyToConfirm(onConfirmSuccess);

    await act(async () => {
      fireEvent.click(screen.getByText("confirm"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onConfirmSuccess).toHaveBeenCalledExactlyOnceWith(
      fakeCompletedTransaction,
    );
  });

  it("does not call onSuccess if the save fails", async () => {
    mockSaveTransaction.mockRejectedValue(new Error("network error"));
    const onConfirmSuccess = vi.fn();
    await readyToConfirm(onConfirmSuccess);

    await act(async () => {
      fireEvent.click(screen.getByText("confirm"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onConfirmSuccess).not.toHaveBeenCalled();
  });
});

describe("TransactionBuilderProvider — cancelReceipt", () => {
  it("cancels the transaction and resets payer name and amount paid", async () => {
    mockCancelTransaction.mockResolvedValue({
      ...fakeCompletedTransaction,
      status: "cancelled",
    });
    await readyToConfirm();

    await act(async () => {
      fireEvent.click(screen.getByText("cancel"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockCancelTransaction).toHaveBeenCalledWith(1);
    expect(screen.getByTestId("payer-name").textContent).toBe("");
    expect(screen.getByTestId("line-count").textContent).toBe("0");
  });

  it("notifies if the cancel fails", async () => {
    mockCancelTransaction.mockRejectedValue(new Error("network error"));
    await readyToConfirm();

    await act(async () => {
      fireEvent.click(screen.getByText("cancel"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockNotifyMutationError).toHaveBeenCalledWith(
      expect.any(Error),
      "Couldn't cancel the transaction. Please try again.",
    );
  });
});