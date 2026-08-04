import { apiClient } from "@/lib/axios/api-client";
import type { Cashier } from "../types";

export const getCashiers = async (): Promise<Cashier[]> => {
  const response = await apiClient.get<Cashier[]>("/users", {
    params: {
      "filter[role]": "cashier",
      "fields[]": "full_name",
    },
  });
  return response.data;
};
