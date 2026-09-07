import { apiClient } from "@/lib/axios/api-client";
import type { TransactionDTO } from "../types";

/**
 * `POST /transactions/:id/void` — admin only, and valid only while the
 * transaction is `completed`.
 *
 * **No request body.** The endpoint takes none, which is why the Void page
 * captures no reason or remarks: there is nowhere to send them.
 *
 * Moves the transaction to `returned` and stamps `voided_by` and
 * `voided_at`, inside a database transaction that also writes the activity
 * log entry. There is no un-void endpoint, so this is irreversible from
 * here and from anywhere else in the product.
 *
 * Two failures are worth telling apart, and the caller does it by
 * surfacing the server's own message rather than a generic one:
 * `TransactionPolicy::void` refuses a non-admin with a 403, and
 * `ensureActionAllowed` refuses any status but `completed` with a 409
 * reading "Invalid Action. Cannot void a transaction with status
 * 'returned'." The second is the one an admin will actually meet, when
 * another admin voided the row first.
 *
 * The response is the voided transaction, but with only `items` and
 * `cashier` loaded — **not** `voidedBy`. Checked against the source: the
 * voiding user's name comes back from `show`, which eager-loads it once
 * the status is `returned`, and from nowhere else.
 */
export const voidTransaction = async (
  controlId: number,
): Promise<TransactionDTO> => {
  const response = await apiClient.post<TransactionDTO>(
    `/transactions/${controlId}/void`,
  );
  return response.data;
};
