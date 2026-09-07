// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError } from "axios";
import { createMemoryRouter, RouterProvider } from "react-router";
import { fireEvent } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { getTransaction } from "../api/get-transaction";
import { ViewTransactionPage } from "./view-transaction-page";
import type { TransactionDTO } from "../types";

// Seam: the page's own public interface — what it renders given a mocked
// getTransaction response, keyed off the :controlId route param. Not
// testing create-router.tsx's wiring here (config, not logic).
//
// react-router's useNavigate is mocked as a library boundary (same class
// as apiClient) so the Print action's destination can be asserted
// directly, without depending on the print route/page existing yet.

vi.mock("../api/get-transaction");
const mockGetTransaction = vi.mocked(getTransaction);

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>(
    "react-router",
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

const fakeTransaction: TransactionDTO = {
  control_id: 62598,
  cashier: { id: 1, full_name: "Jaypee Pahayahay" },
  series_number: 66044,
  customer_name: "asdfsf",
  items: [
    { id: 1, name: "2025-2026", price: 5100, quantity: 1, subtotal: 5100 },
  ],
  total: 5100,
  amount_paid: 5100,
  change_amount: 0,
  status: "completed",
  date: "2026-08-24T06:30:00.000000Z",
};

function makeForbiddenError(): AxiosError {
  const error = new AxiosError("You do not have permission to perform this action.");
  error.response = { status: 403 } as AxiosError["response"];
  return error;
}

function makeServerError(): AxiosError {
  const error = new AxiosError("Server error");
  error.response = { status: 500 } as AxiosError["response"];
  return error;
}

function renderPage(controlId = "62598") {
  const router = createMemoryRouter(
    [{ path: "/transactions/:controlId", element: <ViewTransactionPage /> }],
    { initialEntries: [`/transactions/${controlId}`] },
  );
  return renderWithQueryClient(<RouterProvider router={router} />);
}

describe("ViewTransactionPage", () => {
  beforeEach(() => {
    mockGetTransaction.mockReset();
    mockNavigate.mockReset();
  });

  it("renders the fetched transaction's header, line items, and totals", async () => {
    mockGetTransaction.mockResolvedValue(fakeTransaction);
    renderPage();

    expect(await screen.findByText("asdfsf")).toBeInTheDocument();
    expect(screen.getByText("62598", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("66044", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("2025-2026")).toBeInTheDocument();
    expect(screen.getByText("Total: ₱5,100.00")).toBeInTheDocument();
    expect(mockGetTransaction).toHaveBeenCalledWith(62598);
  });

  it("shows the page's own shape while the fetch is in flight", () => {
    // A skeleton, not a spinner, and specifically this page's skeleton:
    // the header, the four-column items table and the totals are known
    // before the transaction is. The Print page keeps the spinner, its
    // layout being two compact copies on 8.5 by 4 inch stock.
    //
    // This path matters more since #62: voiding removes the transaction's
    // cached detail rather than marking it stale, so an admin who voids
    // one and opens it lands here rather than on a cached page.
    mockGetTransaction.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();

    expect(
      screen.getByTestId("transaction-detail-skeleton"),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Service" })).toBeInTheDocument();
    // Nothing to print yet, and nothing claiming there is.
    expect(screen.queryByRole("button", { name: /print/i })).toBeNull();
  });

  it("shows a distinct message when access is forbidden (403)", async () => {
    mockGetTransaction.mockRejectedValue(makeForbiddenError());
    renderPage();

    expect(
      await screen.findByText(/don't have access to this transaction/i),
    ).toBeInTheDocument();
  });

  it("shows a generic error message for other failures", async () => {
    mockGetTransaction.mockRejectedValue(makeServerError());
    renderPage();

    expect(
      await screen.findByText(/couldn't load this transaction/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/don't have access to this transaction/i),
    ).not.toBeInTheDocument();
  });

  it("navigates to this transaction's print route when Print is clicked", async () => {
    mockGetTransaction.mockResolvedValue(fakeTransaction);
    renderPage();

    const printButton = await screen.findByRole("button", { name: /print/i });
    fireEvent.click(printButton);

    expect(mockNavigate).toHaveBeenCalledExactlyOnceWith(
      "/transactions/62598/print",
    );
  });

  it("shows the status of a completed transaction and leaves Print usable", async () => {
    mockGetTransaction.mockResolvedValue(fakeTransaction);
    renderPage();

    expect(await screen.findByText("Completed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /print/i })).toBeEnabled();
  });

  it("says Voided, not Returned, for a transaction an admin voided", async () => {
    mockGetTransaction.mockResolvedValue({
      ...fakeTransaction,
      status: "returned",
    });
    renderPage();

    // The admin action is called Void. "Returned" is the wire's word.
    expect(await screen.findByText("Voided")).toBeInTheDocument();
    expect(screen.queryByText("Returned")).toBeNull();
  });

  it("disables Print on a voided transaction and says why", async () => {
    mockGetTransaction.mockResolvedValue({
      ...fakeTransaction,
      status: "returned",
    });
    renderPage();

    const printButton = await screen.findByRole("button", { name: /print/i });
    expect(printButton).toBeDisabled();
    expect(screen.getByText(/only a completed transaction/i)).toBeInTheDocument();
  });

  it("still shows a voided transaction's contents, so it can be looked up", async () => {
    mockGetTransaction.mockResolvedValue({
      ...fakeTransaction,
      status: "returned",
    });
    renderPage();

    // Refusing to print is not refusing to look — a cashier still has to
    // be able to answer a payer's question about it.
    expect(await screen.findByText("asdfsf")).toBeInTheDocument();
    expect(screen.getByText("2025-2026")).toBeInTheDocument();
  });

  it("keeps the Print button on screen rather than hiding it", async () => {
    mockGetTransaction.mockResolvedValue({
      ...fakeTransaction,
      status: "cancelled",
    });
    renderPage();

    // A missing button reads as the page having failed to load, to
    // someone who prints these all day.
    expect(
      await screen.findByRole("button", { name: /print/i }),
    ).toBeInTheDocument();
  });

  it("shows a placeholder for blank fields rather than leaving them empty", async () => {
    mockGetTransaction.mockResolvedValue({
      ...fakeTransaction,
      customer_name: null,
      series_number: null,
      total: null,
      items: [],
      status: "pending",
    });
    renderPage();

    await screen.findByText("Pending");

    // All three fields story 7 names. "not assigned yet" has to read
    // differently from "failed to load", and a zero total would say the
    // payer owed nothing rather than that nothing has been totalled.
    //
    // The payer's name renders as the placeholder alone, where the other
    // two sit inside a labelled line — so an exact-text match on "—"
    // finds that one and only that one.
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Series No.: —")).toBeInTheDocument();
    expect(screen.getByText("Total: —")).toBeInTheDocument();
    expect(screen.queryByText("Total: ₱0.00")).toBeNull();
  });

  it("refuses to print an incomplete transaction", async () => {
    mockGetTransaction.mockResolvedValue({
      ...fakeTransaction,
      customer_name: null,
      series_number: null,
      total: null,
      items: [],
      status: "pending",
    });
    renderPage();

    expect(await screen.findByRole("button", { name: /print/i })).toBeDisabled();
  });
  // #62 put the void action on its own page, and this is where its record
  // lands: the voiding user's name is available from `show` and nowhere
  // else, so no list can show it.
  const voided: TransactionDTO = {
    ...fakeTransaction,
    status: "returned",
    voided_at: "2026-09-01T09:15:00.000000Z",
    voided_by: { id: 99, full_name: "Mike Bautista" },
  };

  it("says who voided a transaction, and when", async () => {
    mockGetTransaction.mockResolvedValue(voided);
    renderPage();

    expect(
      await screen.findByText(/Voided on Sep 1, 2026,.* by Mike Bautista/),
    ).toBeInTheDocument();
  });

  it("says nothing about voiding on a transaction that wasn't", async () => {
    mockGetTransaction.mockResolvedValue(fakeTransaction);
    renderPage();

    await screen.findByRole("button", { name: /print/i });
    expect(screen.queryByText(/Voided on/)).toBeNull();
  });

  it("still says when, if the voiding user didn't come back", async () => {
    // `voided_at` is a plain column and `voided_by` a relation behind an
    // eager load. A response carrying one without the other should read as
    // an unknown admin rather than swallow the line.
    mockGetTransaction.mockResolvedValue({ ...voided, voided_by: undefined });
    renderPage();

    expect(
      await screen.findByText(/Voided on Sep 1, 2026,.* by an unknown admin/),
    ).toBeInTheDocument();
  });
});
