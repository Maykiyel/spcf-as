import { z } from "zod";
import { apiClient } from "@/lib/axios/api-client";
import type { Service } from "@/api/services";

export const serviceInputSchema = z.object({
  name: z.string().min(1, "Service name is required").max(100),
  price: z.coerce.number().gt(0, "Price must be greater than 0"),
  description: z.string().max(255).optional(),
});

export type ServiceFormInput = z.input<typeof serviceInputSchema>;
export type ServiceInputFields = z.output<typeof serviceInputSchema>;

export type CreateServicePayload =
  | (ServiceInputFields & { item_code_id: number })
  | (ServiceInputFields & { item_code_name: string });

export const createService = async (
  data: CreateServicePayload,
): Promise<Service> => {
  const response = await apiClient.post<Service, CreateServicePayload>(
    "/services",
    data,
  );
  return response.data;
};
