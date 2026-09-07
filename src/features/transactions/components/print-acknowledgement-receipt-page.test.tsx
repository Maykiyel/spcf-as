// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { createMemoryRouter, RouterProvider } from "react-router";
import { act, render, waitFor } from "@testing-library/react";
import { theme } from "@/config/theme";
import { screen, renderWithQueryClient } from "@/test/render";
import { getTransaction } from "../api/get-transaction";
import { PrintAcknowledgementReceiptPage } from "./print-acknowledgement-receipt-page";
import type { TransactionDTO } from "../types";

// Seam: the page's own public interface — what it renders and does given
// a mocked getTransaction response, keyed off the :controlId route param.

vi.mock("../api/get-transaction");
const mockGetTransaction = vi.mocked(getTransaction);

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

function renderPage(controlId = "62598") {
  const router = createMemoryRouter(
    [
      {
        path: "/transactions/:controlId/print",
        element: <PrintAcknowledgementReceiptPage />,
      },
    ],
    { initialEntries: [`/transactions/${controlId}/print`] },
  );
  return renderWithQueryClient(<RouterProvider router={router} />);
}

describe("PrintAcknowledgementReceiptPage", () => {
  beforeEach(() => {
    mockGetTransaction.mockReset();
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  it("waits with a spinner, not the View page's skeleton", () => {
    // The two pages share `TransactionDetailFallback` so they can't word a
    // 403 or a failure differently, but they deliberately do not share a
    // loading *shape*. This page prints two compact copies onto 8.5 by 4
    // inch stock, so the View page's header-plus-items-table skeleton
    // would be a lie here. Asserted because that is a decision nothing
    // else would catch: moving the skeleton into the fallback's default
    // would silently change this page.
    mockGetTransaction.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();

    expect(screen.getByText(/loading transaction/i)).toBeInTheDocument();
    expect(
      screen.queryByTestId("transaction-detail-skeleton"),
    ).toBeNull();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders both copies with their distinct labels", async () => {
    mockGetTransaction.mockResolvedValue(fakeTransaction);
    renderPage();

    expect(
      await screen.findByText("ACCOUNTING OFFICE'S COPY"),
    ).toBeInTheDocument();
    expect(screen.getByText("STUDENT'S COPY")).toBeInTheDocument();
  });

  it("calls window.print() exactly once once the transaction has loaded", async () => {
    mockGetTransaction.mockResolvedValue(fakeTransaction);
    renderPage();

    await screen.findByText("ACCOUNTING OFFICE'S COPY");
    await waitFor(() => expect(window.print).toHaveBeenCalledExactlyOnceWith(), {
      timeout: 2000,
    });
  });

  it("does not call window.print() before the transaction has loaded", () => {
    mockGetTransaction.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();

    expect(window.print).not.toHaveBeenCalled();
  });

  it("calls window.print() only once when the transaction is already cached (warm from the View page) under StrictMode", async () => {
    // The real path: both pages share one query key and one QueryClient, so
    // arriving from View the transaction is truthy on the very first
    // render. That puts the print effect inside StrictMode's double-invoke
    // window, which a cold fetch never reaches.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(["transactions", 62598], fakeTransaction);
    mockGetTransaction.mockResolvedValue(fakeTransaction);

    const router = createMemoryRouter(
      [
        {
          path: "/transactions/:controlId/print",
          element: <PrintAcknowledgementReceiptPage />,
        },
      ],
      { initialEntries: ["/transactions/62598/print"] },
    );

    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <MantineProvider theme={theme}>
            <RouterProvider router={router} />
          </MantineProvider>
        </QueryClientProvider>
      </StrictMode>,
    );

    await screen.findByText("ACCOUNTING OFFICE'S COPY");
    await waitFor(() => expect(window.print).toHaveBeenCalledExactlyOnceWith(), {
      timeout: 2000,
    });
  });

  it("shows a back link excluded from the printed output", async () => {
    mockGetTransaction.mockResolvedValue(fakeTransaction);
    renderPage();

    const backLink = await screen.findByRole("button", {
      name: /back to transaction/i,
    });
    expect(backLink.className).toContain("no-print");
  });

  describe("a transaction that can't be printed", () => {
    it("explains the refusal instead of rendering the receipt", async () => {
      mockGetTransaction.mockResolvedValue({
        ...fakeTransaction,
        status: "returned",
      });
      renderPage();

      expect(
        await screen.findByText(/only a completed transaction/i),
      ).toBeInTheDocument();
      expect(screen.queryByText("ACCOUNTING OFFICE'S COPY")).toBeNull();
      expect(screen.queryByText("STUDENT'S COPY")).toBeNull();
    });

    it("never opens the print dialog", async () => {
      mockGetTransaction.mockResolvedValue({
        ...fakeTransaction,
        status: "returned",
      });
      renderPage();

      await screen.findByText(/only a completed transaction/i);

      // Gating only the JSX would still pop a dialog over the refusal.
      //
      // A fixed flush, not `waitFor`: a negative assertion passes on its
      // first check, so it would wait for nothing. The wait clears the
      // 400ms image timeout and the two rAFs before `window.print()`.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
      });

      expect(window.print).not.toHaveBeenCalled();
    });

    it("refuses an incomplete transaction, not only a voided one", async () => {
      mockGetTransaction.mockResolvedValue({
        ...fakeTransaction,
        customer_name: null,
        series_number: null,
        total: null,
        items: [],
        status: "pending",
      });
      renderPage();

      // Reachable today by typing a control id into the address bar. It
      // used to print two copies with a blank payer and a zero total.
      expect(
        await screen.findByText(/only a completed transaction/i),
      ).toBeInTheDocument();
      expect(window.print).not.toHaveBeenCalled();
    });

    it("still offers the way back to the transaction", async () => {
      mockGetTransaction.mockResolvedValue({
        ...fakeTransaction,
        status: "cancelled",
      });
      renderPage();

      await screen.findByText(/only a completed transaction/i);
      expect(
        screen.getByRole("button", { name: /back to transaction/i }),
      ).toBeInTheDocument();
    });
  });
});
