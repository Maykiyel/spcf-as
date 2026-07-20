import { apiClient } from "@/lib/axios/api-client";
import type { Supplier } from "../types";
import type { SupplierInput } from "./create-supplier";

type UpdateSupplierData = {
  supplier: Supplier;
};

export const updateSupplier = async (
  id: number,
  data: SupplierInput,
): Promise<Supplier> => {
  const response = await apiClient.put<UpdateSupplierData, SupplierInput>(
    `/suppliers/${id}`,
    data,
  );
  return response.data.supplier;
};
