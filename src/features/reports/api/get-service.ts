import { apiClient } from "@/lib/axios/api-client";
import type { Service } from "@/api/services";

/** One service by id, for the drill-down heading: that route carries an id
 * and its rows carry no service at all. Feature-local until a second
 * feature wants it, per CONTEXT.md's `src/api/` rule. */
export const getService = async (serviceId: number): Promise<Service> => {
  const response = await apiClient.get<Service>(`/services/${serviceId}`);
  return response.data;
};
