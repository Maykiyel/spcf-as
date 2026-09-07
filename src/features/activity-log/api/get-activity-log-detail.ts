import { apiClient } from "@/lib/axios/api-client";
import type { ActivityLogDetail } from "../types";

// GET /activity-logs/:id, admin only. Fetched when the drawer opens, for
// the two things the list row doesn't carry: the field-level details and
// the subject reference.
export const getActivityLogDetail = async (
  id: number,
): Promise<ActivityLogDetail> => {
  const response = await apiClient.get<ActivityLogDetail>(
    `/activity-logs/${id}`,
  );
  return response.data;
};
