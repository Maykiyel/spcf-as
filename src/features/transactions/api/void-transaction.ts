import { apiClient } from "@/lib/axios/api-client";
import type { TransactionDTO } from "../types";

/**
 * `POST /transactions/:id/void` — admin only, `completed` only,
 * irreversible, and takes no body, which is why the Void page captures no
 * reason or remarks.
 *
 * The caller surfaces both failures verbatim: a 403, and a 409 naming the
 * status it found. The response does **not** load `voidedBy`; only `show`
 * does. See BACKEND_NOTES.md.
 */
export const voidTransaction = async (
  controlId: number,
): Promise<TransactionDTO> => {
  const response = await apiClient.post<TransactionDTO>(
    `/transactions/${controlId}/void`,
  );
  return response.data;
};
