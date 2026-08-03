import { apiClient } from "@/lib/axios/api-client";
import type { ItemCode } from "../types";

export const getItemCodes = async (): Promise<ItemCode[]> => {
  const response = await apiClient.get<ItemCode[]>("/item-codes");
  return response.data;
};