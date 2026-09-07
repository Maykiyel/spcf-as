import { apiClient } from "@/lib/axios/api-client";

/** The server refuses anyone holding any history, with a 422 carrying its
 * own explanation. Show it as written: it is a rule, not a failure. */
export const deleteUserAccount = async (id: number): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};
