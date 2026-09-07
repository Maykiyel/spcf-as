import { apiClient } from "@/lib/axios/api-client";
import type { TransactionDTO } from "../types";

// GET /transactions/:id, behind `TransactionPolicy::view`: a cashier can
// fetch only their own, an admin any.
//
// Both pages reach it through `useTransactionDetail` rather than router
// state, so the entry point makes no difference.
export const getTransaction = async (
  controlId: number,
): Promise<TransactionDTO> => {
  const response = await apiClient.get<TransactionDTO>(
    `/transactions/${controlId}`,
  );
  return response.data;
};
