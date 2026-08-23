import { apiClient } from "@/lib/axios/api-client";
import type { Service } from "@/api/services";

export const toggleServiceActive = async (
  id: number,
  isActive: boolean,
): Promise<Service> => {
  const response = await apiClient.patch<Service, { is_active: boolean }>(
    `/services/${id}/active-status`,
    { is_active: isActive },
  );
  return response.data;
};
