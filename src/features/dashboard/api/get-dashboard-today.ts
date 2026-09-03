import { apiClient } from "@/lib/axios/api-client";
import type { DashboardToday } from "../types";

export const DASHBOARD_TODAY_QUERY_KEY = ["dashboard-today"] as const;

/** The only dashboard endpoint a cashier is allowed to call. It takes no
 * parameters at all: "today" is always today, and the scoping is decided
 * server-side from the signed-in user's role. */
export const getDashboardToday = async (): Promise<DashboardToday> => {
  const response = await apiClient.get<DashboardToday>("/dashboard");
  return response.data;
};
