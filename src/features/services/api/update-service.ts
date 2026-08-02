import { apiClient } from "@/lib/axios/api-client";
import type { Service } from "../types";
import { type ServiceInputFields } from "./create-service";

export type UpdateServicePayload = ServiceInputFields & {
  item_code_id: number;
};

export const updateService = async (
  id: number,
  data: UpdateServicePayload,
): Promise<Service> => {
  const response = await apiClient.put<Service, UpdateServicePayload>(
    `/services/${id}`,
    data,
  );
  return response.data;
};
