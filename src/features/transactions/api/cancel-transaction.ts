import { apiClient } from "@/lib/axios/api-client";
import type { TransactionDTO } from "../types";

// POST /transactions/:id/cancel — only valid while the transaction is
// still `pending`. Items are preserved (not deleted) server-side for the
// activity trail; the frontend just doesn't display them once cancelled.
export const cancelTransaction = async (
  transactionId: number,
): Promise<TransactionDTO> => {
  const response = await apiClient.post<TransactionDTO>(
    `/transactions/${transactionId}/cancel`,
  );
  return response.data;
};
