import { apiClient } from "@/lib/axios/api-client";
import type { InitiatedTransaction } from "../types";

// POST /transactions — creates a `pending` Transaction row for the current
// cashier's active Series Receipt. Called lazily by the builder on the
// first fee add, not on page mount, to avoid creating an empty `pending`
// row for every cashier who opens the page without building a receipt.
//
// Can 409 with a business-rule message (no active Series Receipt, or the
// active one is exhausted) — surfaced as-is via notifyMutationError, since
// the backend's message is already cashier-facing.
export const initiateTransaction = async (): Promise<InitiatedTransaction> => {
  const response = await apiClient.post<InitiatedTransaction>("/transactions");
  return response.data;
};
