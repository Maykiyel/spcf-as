import { apiClient } from "@/lib/axios/api-client";

type LatestFromData = {
  from: number;
};

export const getLatestFrom = async (): Promise<number> => {
  const response = await apiClient.get<LatestFromData>(
    "/series-receipts/latest-from",
  );
  return response.data.from;
};
