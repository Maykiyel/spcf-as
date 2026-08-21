import { apiClient } from "@/lib/axios/api-client";

// DELETE /transactions/:id/items/:itemId
export const deleteTransactionItem = async (
  transactionId: number,
  itemId: number,
): Promise<void> => {
  await apiClient.delete<unknown>(
    `/transactions/${transactionId}/items/${itemId}`,
  );
};
