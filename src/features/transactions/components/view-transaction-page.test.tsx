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
  date: "2026-08-24",
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

  it("shows a loading state before the fetch resolves", () => {
    mockGetTransaction.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
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
});
