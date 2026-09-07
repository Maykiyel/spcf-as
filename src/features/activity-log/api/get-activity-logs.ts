import { createListAdapter } from "@/components/ui/data-table";
import type { ActivityLogListRow } from "../types";

// No `supportsSearch`: `/activity-logs` accepts no `filter[search]`, and
// an unknown filter key is a 400 rather than an ignored parameter.
export const getActivityLogs = createListAdapter<ActivityLogListRow>(
  "/activity-logs",
  "activity_logs",
);
