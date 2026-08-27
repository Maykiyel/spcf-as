import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/axios/api-client";
import { getTransaction } from "./get-transaction";
import type { TransactionDTO } from "../types";

vi.mock("@/lib/axios/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

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

describe("getTransaction", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("requests the transaction by id and returns the unwrapped payload", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: fakeTransaction,
    } as any);

    const result = await getTransaction(62598);

    expect(apiClient.get).toHaveBeenCalledWith("/transactions/62598");
    expect(result).toEqual(fakeTransaction);
  });
});
