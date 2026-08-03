import { apiClient } from "@/lib/axios/api-client";

export const deleteItemCode = async (id: number): Promise<void> => {
  await apiClient.delete(`/item-codes/${id}`);
};
