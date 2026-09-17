// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { render, screen } from "@/test/render";
import {
  calculateChange,
  calculateTotal,
  draftReadiness,
} from "../lib/transaction-draft";
import type { DraftLineItem } from "../types";
import {
  TransactionDraftContext,
  type TransactionDraftValue,
} from "./transaction-builder-context-value";
import { TransactionDraftPanel } from "./transaction-draft-panel";

// Seam: the panel alone, over a crafted draft value. The context lives
// apart from the provider that fills it, so this needs no provider, no API
// mocks and no timers — the same approach fee-catalog-item-card.test.tsx
// takes to the other panel.
//
// `amountPaid` is held in real state rather than spied on, so the
// assertions are about what the cashier sees: the number in the field and
// the change figure beneath it.

// jsdom implements no ResizeObserver; the line-item table is a Mantine
// ScrollArea, which subscribes to one on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const lineItems: DraftLineItem[] = [
  {
    id: "1",
    feeItemId: 11,
    name: "SHS GRADUATION FEE",
    price: 1200,
    quantity: 1,
  },
  { id: "2", feeItemId: 12, name: "ID REPLACEMENT", price: 150, quantity: 2 },
];

const EXACT = "Fill Amount Paid with the exact total";

function DraftHarness({ items }: { items: DraftLineItem[] }) {
  const [amountPaid, setAmountPaid] = useState(0);
  const readiness = draftReadiness({
    payerName: "Juan Dela Cruz",
    lineItems: items,
    amountPaid,
    isSyncing: false,
  });

  const value: TransactionDraftValue = {
    state: {
      transactionId: 1,
      payerName: "Juan Dela Cruz",
      amountPaid,
      lineItems: items,
    },
    actions: {
      setPayerName: () => {},
      setAmountPaid,
      setLineItemQuantity: () => {},
      removeLineItem: () => {},
      cancelDraft: () => {},
      confirmTransaction: () => {},
    },
    meta: {
      total: calculateTotal(items),
      change: calculateChange(items, amountPaid),
      canConfirm: readiness.ready,
      missingRequirements: readiness.reasons,
      isConfirming: false,
      isCancelling: false,
      isSyncing: false,
      pendingFeeItemIds: new Set(),
      pendingRemovalFeeItemIds: new Set(),
    },
  };

  return (
    <MemoryRouter>
      <TransactionDraftContext.Provider value={value}>
        <TransactionDraftPanel />
      </TransactionDraftContext.Provider>
    </MemoryRouter>
  );
}

const amountPaidField = () => screen.getByLabelText("Amount Paid");
const changeFigure = () =>
  screen.getByText("Change").parentElement!.querySelector("p:last-of-type")!;

describe("TransactionDraftPanel — Exact", () => {
  it("offers the control while the draft has items", () => {
    render(<DraftHarness items={lineItems} />);

    expect(screen.getByRole("button", { name: EXACT })).toBeEnabled();
  });

  it("fills Amount Paid with the total in one click", async () => {
    const user = userEvent.setup();
    render(<DraftHarness items={lineItems} />);

    await user.click(screen.getByRole("button", { name: EXACT }));

    // 1200 + 150 x 2, as the field's own thousand separator renders it.
    expect(amountPaidField()).toHaveValue("1,500.00");
  });

  it("settles the change at zero", async () => {
    const user = userEvent.setup();
    render(<DraftHarness items={lineItems} />);

    await user.click(screen.getByRole("button", { name: EXACT }));

    expect(changeFigure()).toHaveTextContent("₱0.00");
  });

  it("is disabled with no items, as the field beside it already is", () => {
    render(<DraftHarness items={[]} />);

    // Filling a total of zero is not a meaningful action, and an enabled
    // control writing into a disabled field would be incoherent.
    expect(screen.getByRole("button", { name: EXACT })).toBeDisabled();
    expect(amountPaidField()).toBeDisabled();
  });

  it("is operable from the keyboard", async () => {
    const user = userEvent.setup();
    render(<DraftHarness items={lineItems} />);

    screen.getByRole("button", { name: EXACT }).focus();
    await user.keyboard("{Enter}");

    expect(amountPaidField()).toHaveValue("1,500.00");
  });

  it("lets a larger amount be typed over it afterwards", async () => {
    const user = userEvent.setup();
    render(<DraftHarness items={lineItems} />);

    await user.click(screen.getByRole("button", { name: EXACT }));
    await user.clear(amountPaidField());
    await user.type(amountPaidField(), "2000");

    expect(changeFigure()).toHaveTextContent("₱500.00");
  });

  it("does not stand in for Confirm or take its label", () => {
    render(<DraftHarness items={lineItems} />);

    // A helper beside the field, not one of the page's decisions.
    expect(
      screen.getByRole("button", { name: "Confirm Payment" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: EXACT })).toHaveTextContent(
      "Exact",
    );
  });
});
