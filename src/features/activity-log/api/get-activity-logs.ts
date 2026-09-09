import { createListAdapter } from "@/components/ui/data-table";
import type { ActivityLogListRow } from "../types";
import type { SortPlan } from "@/components/ui/data-table";

// No `supportsSearch`: `/activity-logs` accepts no `filter[search]`, and
// an unknown filter key is a 400 rather than an ignored parameter.
export const getActivityLogs = createListAdapter<ActivityLogListRow>(
  "/activity-logs",
  "activity_logs",
);

/** `created_at` is the endpoint's sole allow-listed sort, so When is the
 * only column that may be marked sortable and any other header click would
 * be a 400. Declared as the default so that header carries a caret over
 * rows the endpoint was already ordering. */
export const ACTIVITY_LOGS_SORT_PLAN: SortPlan = {
  allowed: ["created_at"],
  default: [{ key: "created_at", direction: "desc" }],
};
