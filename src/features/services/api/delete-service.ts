import { apiClient } from "@/lib/axios/api-client";

/** The server refuses a service that has ever been charged, with a 409
 * carrying its own explanation. Show it as written: it is a rule, not a
 * failure. */
export const deleteService = async (id: number): Promise<void> => {
  await apiClient.delete(`/services/${id}`);
};
