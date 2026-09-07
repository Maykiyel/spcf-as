import { createListAdapter } from "@/components/ui/data-table";
import type { ActivityLogListRow } from "../types";

/**
 * One page of activity, newest first. A bare adapter: the endpoint's whole
 * filter surface is `from_date`/`to_date`, already named the way the wire
 * names them.
 *
 * No `supportsSearch`: `/activity-logs` accepts none and an unknown filter
 * key is a 400, which is why this page has no search box.
 */
export const getActivityLogs = createListAdapter<ActivityLogListRow>(
  "/activity-logs",
  "activity_logs",
);
