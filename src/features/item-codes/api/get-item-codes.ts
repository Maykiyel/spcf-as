import { apiClient } from "@/lib/axios/api-client";
import {
  encodeSortsForApi,
  type ServerTableParams,
  type ServerTableResponse,
} from "@/components/ui/data-table";
import type { ItemCode } from "@/api/item-codes";

type ItemCodesIndexData = {
  item_codes: ItemCode[];
  pagination: { total: number };
};

// For the paginated admin table (ItemCodeTable / useServerTableState).
export const getItemCodes = async (
  params: ServerTableParams,
): Promise<ServerTableResponse<ItemCode>> => {
  const response = await apiClient.get<ItemCodesIndexData>("/item-codes", {
    params: {
      per_page: params.per_page,
      page: params.page,
      sort: encodeSortsForApi(params.sorts),
    },
  });

  return {
    data: response.data.item_codes,
    total: response.data.pagination.total,
  };
};
