import type { ColumnDef } from "@/components/ui/data-table";
import { formatDateTime } from "@/utils/date-time";
import type { ActivityLogListRow } from "../types";

/** Only When is `sortable`: `created_at` is the sole key
 * `ACTIVITY_LOGS_SORT_PLAN` allow-lists, so any other header click would be
 * a 400. */
export const activityLogColumns: ColumnDef<ActivityLogListRow>[] = [
  {
    key: "created_at",
    header: "When",
    sortable: true,
    render: (row) => formatDateTime(row.created_at),
  },
  {
    key: "type",
    header: "Type",
  },
  {
    key: "context",
    header: "What happened",
  },
  {
    key: "actor",
    header: "Who",
    // Never null: a system-generated entry arrives named "System".
    render: (row) => row.actor.name,
  },
];
