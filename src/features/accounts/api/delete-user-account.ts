import { apiClient } from "@/lib/axios/api-client";

/**
 * Deletion is conditional and the condition lives on the server:
 * `User::canBeDeleted()` refuses anyone holding transactions, series
 * receipts, accounts they created, or transactions they voided. A refusal
 * comes back as a 422 carrying its own explanation, which the caller is
 * expected to show as written — it is a rule, not a failure.
 */
export const deleteUserAccount = async (id: number): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};
