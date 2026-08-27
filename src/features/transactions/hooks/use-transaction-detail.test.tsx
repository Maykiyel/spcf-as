// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTransactionDetail } from "./use-transaction-detail";
import { getTransaction } from "../api/get-transaction";
import type { TransactionDTO } from "../types";

vi.mock("../api/get-transaction");

const mockGetTransaction = vi.mocked(getTransaction);

const savedTransaction = {
  id: 62598,
  control_id: 62598,
  series_number: 42,
  customer_name: "Juan Dela Cruz",
  date: "2026-08-24T06:30:00.000000Z",
  total: 200,
  amount_paid: 500,
  change: 300,
  items: [],
} as unknown as TransactionDTO;

function makeAxiosError(status: number): AxiosError {
  const error = new AxiosError("request failed");
  error.response = { status } as AxiosError["response"];
  return error;
}

// A fresh client per render so cached query state can't leak between
// tests, mirroring renderWithQueryClient in src/test/render.tsx.
function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useTransactionDetail", () => {
  it("returns the fetched transaction", async () => {
    mockGetTransaction.mockResolvedValue(savedTransaction);

    const { result } = renderHook(() => useTransactionDetail(62598), {
      wrapper,
    });

    await waitFor(() => expect(result.current.transaction).toEqual(savedTransaction));
    expect(mockGetTransaction).toHaveBeenCalledWith(62598);
  });

  it("classifies a 403 as forbidden", async () => {
    mockGetTransaction.mockRejectedValue(makeAxiosError(403));

    const { result } = renderHook(() => useTransactionDetail(62598), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isForbidden).toBe(true));
  });

  it("does not classify a non-403 failure as forbidden", async () => {
    mockGetTransaction.mockRejectedValue(makeAxiosError(500));

    const { result } = renderHook(() => useTransactionDetail(62598), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isForbidden).toBe(false);
  });

  // Both pages derive their id with `Number(useParams().controlId)`, so a
  // non-numeric URL segment reaches this hook as NaN. Without a gate that
  // fires a real GET /transactions/NaN and poisons the query cache with a
  // NaN key.
  it("does not fetch when the control id is not a number", () => {
    mockGetTransaction.mockResolvedValue(savedTransaction);

    const { result } = renderHook(() => useTransactionDetail(Number("abc")), {
      wrapper,
    });

    expect(mockGetTransaction).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("surfaces an unparseable control id as an error, not an endless load", () => {
    mockGetTransaction.mockResolvedValue(savedTransaction);

    const { result } = renderHook(() => useTransactionDetail(Number("abc")), {
      wrapper,
    });

    expect(result.current.isError).toBe(true);
  });
});
