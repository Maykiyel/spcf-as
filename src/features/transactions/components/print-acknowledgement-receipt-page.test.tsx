// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { createMemoryRouter, RouterProvider } from "react-router";
import { render, waitFor } from "@testing-library/react";
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
    // Reproduces the real-world path: both pages call useTransactionDetail
    // with the identical queryKey (["transactions", controlId]) against
    // the same app-wide QueryClient. By the time a cashier clicks Print,
    // the View page's fetch has already warmed this exact cache entry —
    // so on the Print page's very first render, `transaction` is already
    // truthy, synchronously, putting the print-triggering effect run
    // inside StrictMode's double-invoke window (which only wraps the
    // initial mount, not later re-runs from a cold, asynchronously
    // resolving fetch).
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
});
