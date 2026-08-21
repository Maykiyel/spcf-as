import { apiClient } from "@/lib/axios/api-client";
import type { TransactionItemDTO } from "../types";

// PATCH /transactions/:id/items/:itemId — sets quantity to the given
// value (absolute, not an increment — unlike the add-item endpoint).
export const updateTransactionItemQuantity = async (
  transactionId: number,
  itemId: number,
  quantity: number,
): Promise<TransactionItemDTO> => {
  const response = await apiClient.patch<TransactionItemDTO, { quantity: number }>(
    `/transactions/${transactionId}/items/${itemId}`,
    { quantity },
  );
  return response.data;
};
