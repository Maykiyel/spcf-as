import { apiClient } from "@/lib/axios/api-client";
import type { Supplier, SupplierPagination } from "../types";
import type {
  ServerTableParams,
  ServerTableResponse,
} from "@/components/ui/data-table";

type SuppliersIndexData = {
  data: {
    suppliers: Supplier[];
  };
  pagination: SupplierPagination;
};

export const getSuppliers = async (
  params: ServerTableParams,
): Promise<ServerTableResponse<Supplier>> => {
  const response = await apiClient.get<SuppliersIndexData>("/suppliers", {
    params: {
      page: params.page,
      per_page: params.per_page,
      search: params.search,
      sort_by: params.sortBy,
      sort_order: params.sortOrder,
    },
  });
  return {
    data: response.data.data.suppliers,
    total: response.data.pagination.total,
  };
};
