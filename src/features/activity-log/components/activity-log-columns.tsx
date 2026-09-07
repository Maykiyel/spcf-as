import type { ColumnDef, SortEntry } from "@/components/ui/data-table";
import { formatDateTime } from "@/utils/date-time";
import type { ActivityLogListRow } from "../types";

/** Declared so the When header shows a caret over rows the endpoint was
 * already ordering. Must stay equal to that column's key. */
export const ACTIVITY_LOG_DEFAULT_SORTS: SortEntry[] = [
  { key: "created_at", direction: "desc" },
];

/** Only When is `sortable`: `created_at` is the endpoint's sole
 * allow-listed sort, so any other header click would be a 422. */
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
