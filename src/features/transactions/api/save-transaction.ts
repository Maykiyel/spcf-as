import { apiClient } from "@/lib/axios/api-client";
import type { TransactionDTO } from "../types";

export type SaveTransactionPayload = {
  customer_name: string;
  amount_paid: number;
};

// POST /transactions/:id/save — this is the actual "Confirm Payment" step.
// Series receipt assignment (`series_number`) happens server-side inside
// this call, atomically with marking the transaction `completed`. Can 409
// if the transaction is no longer in a savable state (e.g. it was
// cancelled in another tab), or 422 if amount_paid is less than the
// server-computed total (a stale client-side total, or a rounding edge
// case) — both are surfaced via notifyMutationError.
export const saveTransaction = async (
  transactionId: number,
  payload: SaveTransactionPayload,
): Promise<TransactionDTO> => {
  const response = await apiClient.post<TransactionDTO, SaveTransactionPayload>(
    `/transactions/${transactionId}/save`,
    payload,
  );
  return response.data;
};
