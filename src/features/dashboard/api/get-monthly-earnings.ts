import { apiClient } from "@/lib/axios/api-client";
import type { MonthlyEarnings } from "../types";

/**
 * Earnings per month across one year, admin-only.
 *
 * `data` is the array itself rather than a named key, unlike every other
 * list endpoint here, and there is no pagination to go with it. It always
 * holds exactly twelve entries: the endpoint zero-fills months with no
 * earnings, so nothing here has to reconstruct a missing month.
 */
export const getMonthlyEarnings = async (
  year: number,
): Promise<MonthlyEarnings[]> => {
  const response = await apiClient.get<MonthlyEarnings[]>(
    "/reports/monthly-earnings",
    { params: { year } },
  );
  return response.data;
};
