import { apiClient } from "@/lib/axios/api-client";
import {
  encodeSortsForApi,
  type ServerTableParams,
  type ServerTableResponse,
} from "@/components/ui/data-table";
import type { Service } from "../types";

type ServicesIndexData = {
  services: Service[];
  pagination: { total: number };
};

export const getServices = async (
  params: ServerTableParams,
  isActive: boolean | null,
): Promise<ServerTableResponse<Service>> => {
  const response = await apiClient.get<ServicesIndexData>("/services", {
    params: {
      per_page: params.per_page,
      page: params.page,
      "filter[search]": params.search,
      sort: encodeSortsForApi(params.sorts),
      "filter[is_active]": isActive === null ? undefined : Number(isActive),
    },
  });

  return {
    data: response.data.services,
    total: response.data.pagination.total,
  };
};
