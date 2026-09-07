import type { ColumnDef, SortEntry } from "@/components/ui/data-table";
import { formatDateTime } from "@/utils/date-time";
import type { ActivityLogListRow } from "../types";

/** `/activity-logs` sorts by `-created_at` when asked for nothing, so
 * declaring it puts a caret on the When header rather than leaving rows
 * plainly ordered under a column that looks unsorted. */
export const ACTIVITY_LOG_DEFAULT_SORTS: SortEntry[] = [
  { key: "created_at", direction: "desc" },
];

/**
 * The columns of the Activity Log. Nothing here is built client-side:
 * `context` is the readable sentence the backend generated when the entry
 * was written, and `type` is already a display string.
 *
 * Only When is `sortable`. `created_at` is the endpoint's sole allow-listed
 * sort, so any other header click would be a 422.
 */
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
