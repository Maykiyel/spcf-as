import { z } from "zod";
import { apiClient } from "@/lib/axios/api-client";
import type { ItemCode } from "../types";

export const itemCodeInputSchema = z.object({
  name: z.string().min(1, "Item code name is required").max(100),
  description: z.string().max(255).optional(),
});

export type ItemCodeInput = z.infer<typeof itemCodeInputSchema>;

export const createItemCode = async (
  data: ItemCodeInput,
): Promise<ItemCode> => {
  const response = await apiClient.post<ItemCode, ItemCodeInput>(
    "/item-codes",
    data,
  );
  return response.data;
};
