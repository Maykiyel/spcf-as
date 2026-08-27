import { apiClient } from "@/lib/axios/api-client";
import type { TransactionDTO } from "../types";

// GET /transactions/:id — powers the View Transaction and Print
// Acknowledgement Receipt pages. Gated by TransactionPolicy::view: a
// cashier can only fetch their own transactions (403 otherwise); an admin
// can fetch any. Always called fresh on mount by both pages rather than
// relying on router-passed state, so behavior is identical regardless of
// entry point (fresh confirm, per-receipt list, bookmark, refresh).
export const getTransaction = async (
  transactionId: number,
): Promise<TransactionDTO> => {
  const response = await apiClient.get<TransactionDTO>(
    `/transactions/${transactionId}`,
  );
  return response.data;
};
