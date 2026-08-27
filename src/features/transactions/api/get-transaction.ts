import { apiClient } from "@/lib/axios/api-client";
import type { TransactionDTO } from "../types";

// GET /transactions/:id — powers the View Transaction and Print
// Acknowledgement Receipt pages. Gated by TransactionPolicy::view: a
// cashier can only fetch their own transactions (403 otherwise); an admin
// can fetch any.
//
// Both pages reach this through useTransactionDetail rather than reading
// router state, so behavior is identical regardless of entry point (fresh
// confirm, per-receipt list, bookmark, refresh). That's a separate matter
// from caching — see the note in use-transaction-detail.ts for why a
// cached read is correct for a confirmed transaction.
export const getTransaction = async (
  controlId: number,
): Promise<TransactionDTO> => {
  const response = await apiClient.get<TransactionDTO>(
    `/transactions/${controlId}`,
  );
  return response.data;
};
