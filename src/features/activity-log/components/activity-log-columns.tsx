import type { ColumnDef } from "@/components/ui/data-table";
import { formatDateTime } from "@/utils/date-time";
import { ActivityTypeBadge } from "./activity-type-badge";
import type { ActivityLogListRow } from "../types";

/** Only Date is `sortable`: `created_at` is the sole key
 * `ACTIVITY_LOGS_SORT_PLAN` allow-lists, so any other header click would be
 * a 400. */
export const activityLogColumns: ColumnDef<ActivityLogListRow>[] = [
  {
    field: "created_at",
    header: "Date",
    render: (row) => formatDateTime(row.created_at),
  },
  {
    field: "type",
    header: "Type",
    render: (row) => <ActivityTypeBadge type={row.type} />,
  },
  {
    field: "context",
    header: "Context",
  },
  {
    field: "actor",
    // Not "Account": this codebase already gave that word to the nav group.
    header: "Performed By",
    // Never null: a system-generated entry arrives named "System".
    render: (row) => row.actor.name,
  },
];
