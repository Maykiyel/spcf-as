import { apiClient } from "@/lib/axios/api-client";
import {
  encodeSortsForApi,
  type ServerTableParams,
  type ServerTableResponse,
} from "@/components/ui/data-table";
import type { SeriesReceipt } from "../types";

type SeriesReceiptsIndexData = {
  series_receipts: SeriesReceipt[];
  pagination: { total: number };
};

export const getSeriesReceipts = async (
  params: ServerTableParams,
): Promise<ServerTableResponse<SeriesReceipt>> => {
  const response = await apiClient.get<SeriesReceiptsIndexData>(
    "/series-receipts",
    {
      params: {
        per_page: params.per_page,
        page: params.page,
        "filter[search]": params.search,
        sort: encodeSortsForApi(params.sorts),
      },
    },
  );

  return {
    data: response.data.series_receipts,
    total: response.data.pagination.total,
  };
};
