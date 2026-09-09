import { useState } from "react";
import { Divider } from "@mantine/core";
import { DataTable, useServerTableState } from "@/components/ui/data-table";
import {
  getActivityLogs,
  ACTIVITY_LOGS_SORT_PLAN,
} from "../api/get-activity-logs";
import { ACTIVITY_LOGS_QUERY_KEY } from "../api/activity-log-query-keys";
import type { ActivityLogListRow } from "../types";
import { ActivityLogFilters } from "./activity-log-filters";
import { ActivityLogDrawer } from "./activity-log-drawer";
import { activityLogColumns } from "./activity-log-columns";

const URL_KEY = "activity";

/**
 * The Activity Log. Page pagination rather than the cursor mode the
 * endpoint also offers, because `DataTable.Pagination` needs a total row
 * count and cursor mode returns none.
 */
export function ActivityLogPage() {
  const [selected, setSelected] = useState<ActivityLogListRow | null>(null);

  const tableState = useServerTableState({
    queryKey: [...ACTIVITY_LOGS_QUERY_KEY],
    queryFn: getActivityLogs,
    columns: activityLogColumns,
    urlKey: URL_KEY,
    sortPlan: ACTIVITY_LOGS_SORT_PLAN,
    dateRange: {},
  });

  return (
    <DataTable.Root title="Activity Log" state={tableState}>
      <ActivityLogFilters
        filters={tableState.filters}
        onChange={tableState.setFilters}
      />
      <Divider />
      <DataTable.Toolbar>
        <DataTable.PageSize />
      </DataTable.Toolbar>
      {/* Annotated: the grid's row type isn't inferred from the state. */}
      <DataTable.Grid
        onRowClick={(row: ActivityLogListRow) => setSelected(row)}
      />
      <DataTable.Pagination />
      {/* Local state, not the URL: #63 asks for the date filter to
          survive a refresh, not an open drawer. */}
      <ActivityLogDrawer entry={selected} onClose={() => setSelected(null)} />
    </DataTable.Root>
  );
}
