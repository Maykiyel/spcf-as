import { apiClient } from "@/lib/axios/api-client";
import type {
  ServerTableParams,
  ServerTableResponse,
} from "@/components/ui/data-table";
import type { SeriesReceipt } from "../types";

type SeriesReceiptsIndexData = {
  series_receipts: SeriesReceipt[];
  pagination: { total: number };
};

export const getSeriesReceipts = async (
  params: ServerTableParams,
): Promise<ServerTableResponse<SeriesReceipt>> => {
  const sort = params.sorts
    .map((s) => (s.direction === "desc" ? `-${s.key}` : s.key))
    .join(",");

  const response = await apiClient.get<SeriesReceiptsIndexData>(
    "/series-receipts",
    {
      params: {
        per_page: params.per_page,
        page: params.page,
        "filter[search]": params.search,
        sort: sort || undefined,
      },
    },
  );

  return {
    data: response.data.series_receipts,
    total: response.data.pagination.total,
  };
};
