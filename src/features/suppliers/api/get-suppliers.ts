import { apiClient } from "@/lib/axios/api-client";
import type { Supplier } from "../types";

type SuppliersIndexData = {
  data: {
    suppliers: Supplier[];
  };
  pagination: unknown | null;
};

export const getSuppliers = async (): Promise<Supplier[]> => {
  const response = await apiClient.get<SuppliersIndexData>(
    "/suppliers?all=true",
  );
  return response.data.data.suppliers;
};
