// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithQueryClient, screen } from "@/test/render";
import { VoidTransactionAction } from "./void-transaction-action";
import { voidTransaction } from "../api/void-transaction";
import type { TransactionDTO, TransactionListRow } from "../types";

vi.mock("../api/void-transaction");
vi.mock("@/lib/notifications/notifications");

const mockVoidTransaction = vi.mocked(voidTransaction);

const row: TransactionListRow = {
  control_id: 4021,
  cashier: { id: 3, full_name: "Ana Cruz" },
  series_number: 100455,
  customer_name: "Jose Rizal",
  total: 1500,
  amount_paid: 2000,
  change_amount: 500,
  date: "2026-09-10",
  status: "completed",
  items: [],
};

// Manual promise control, so a test can assert on the dialog *between* the
// request firing and it resolving.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

// Returns once the dialog has actually transitioned in. Mantine's Modal
// animates, so a sync query straight after the click is a race that only
// loses under parallel load — the reason vitest.setup.ts raises
// asyncUtilTimeout rather than lowering it.
async function openDialog() {
  const user = userEvent.setup();
  renderWithQueryClient(<VoidTransactionAction transaction={row} />);
  await user.click(
    screen.getByRole("button", { name: "Void transaction 4021" }),
  );
  await screen.findByRole("button", { name: "Void Transaction" });
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// CONTEXT.md: there is no un-void endpoint and the action takes no reason,
// so this dialog is the only checkpoint that exists. These assert it still
// is one after the move onto ConfirmModal.
describe("VoidTransactionAction", () => {
  it("names all four identifiers, so the row can be matched against the receipt", async () => {
    await openDialog();

    expect(screen.getByText("Void transaction")).toBeInTheDocument();
    expect(screen.getByText("4021")).toBeInTheDocument();
    expect(screen.getByText("100455")).toBeInTheDocument();
    expect(screen.getByText("Jose Rizal")).toBeInTheDocument();
    expect(screen.getByText("₱1,500.00")).toBeInTheDocument();
  });

  it("sends nothing until the confirming action is clicked", async () => {
    await openDialog();

    expect(mockVoidTransaction).not.toHaveBeenCalled();
  });

  it("voids by control id on confirm", async () => {
    mockVoidTransaction.mockResolvedValue({} as TransactionDTO);
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "Void Transaction" }));

    expect(mockVoidTransaction).toHaveBeenCalledWith(4021);
  });

  it("cannot be dismissed by Escape while the void is in flight", async () => {
    const request = deferred<TransactionDTO>();
    mockVoidTransaction.mockReturnValue(request.promise);
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "Void Transaction" }));
    await user.keyboard("{Escape}");

    // Still up, and still naming the transaction it is about to reverse.
    expect(screen.getByText("Void transaction")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    request.resolve({} as TransactionDTO);
  });
});
