import { apiClient } from "@/lib/axios/api-client";
import type { TransactionItemDTO } from "../types";

export type AddTransactionItemPayload = {
  service_id: number;
  quantity: number;
};

// POST /transactions/:id/items — the backend upserts by service_id: if the
// service is already on this transaction, it adds to the existing
// quantity instead of creating a duplicate row. So the caller always sends
// quantity: 1 for an "Add" click; the accumulation happens server-side.
export const addTransactionItem = async (
  transactionId: number,
  payload: AddTransactionItemPayload,
): Promise<TransactionItemDTO> => {
  const response = await apiClient.post<
    TransactionItemDTO,
    AddTransactionItemPayload
  >(`/transactions/${transactionId}/items`, payload);
  return response.data;
};
