import { apiClient } from "@/lib/axios/api-client";
import type { ItemCode } from "@/api/item-codes";
import type { ItemCodeInput } from "./create-item-code";

export const updateItemCode = async (
  id: number,
  data: ItemCodeInput,
): Promise<ItemCode> => {
  const response = await apiClient.put<ItemCode, ItemCodeInput>(
    `/item-codes/${id}`,
    data,
  );
  return response.data;
};
