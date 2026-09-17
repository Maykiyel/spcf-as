import type { ColumnDef } from "@/components/ui/data-table";
import { formatDateTime } from "@/utils/date-time";
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
  },
  {
    // The wire's own word for the readable sentence, kept rather than
    // translated. See CONTEXT.md.
    field: "context",
    header: "Context",
  },
  {
    field: "actor",
    // The two words the filter above the table uses, not "Account", which
    // this codebase already gave to the Accounts nav group.
    header: "Performed By",
    // Never null: a system-generated entry arrives named "System".
    render: (row) => row.actor.name,
  },
];
