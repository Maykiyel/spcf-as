import { useState } from "react";
import { Divider } from "@mantine/core";
import {
  DataTable,
  useServerTableState,
  dateRangeFiltersUsable,
  type TableFilters,
} from "@/components/ui/data-table";
import { getActivityLogs } from "../api/get-activity-logs";
import { ACTIVITY_LOGS_QUERY_KEY } from "../api/activity-log-query-keys";
import type { ActivityLogListRow } from "../types";
import { ActivityLogFilters } from "./activity-log-filters";
import { ActivityLogDrawer } from "./activity-log-drawer";
import {
  activityLogColumns,
  ACTIVITY_LOG_DEFAULT_SORTS,
} from "./activity-log-columns";

const URL_KEY = "activity";

/** The endpoint's whole filter surface. Module scope, not rebuilt per
 * render: the query key includes it. */
const FILTERS: TableFilters = { from_date: null, to_date: null };

/**
 * The Activity Log — the audit trail of everything consequential the
 * backend records, and the only place the admin who voided a transaction
 * is visible.
 *
 * Admin-only through the page registry, with the endpoint enforcing the
 * same rule independently. Page pagination rather than cursor, because the
 * shared pagination control needs a total row count and cursor mode gives
 * none.
 */
export function ActivityLogPage() {
  const [selected, setSelected] = useState<ActivityLogListRow | null>(null);

  const tableState = useServerTableState({
    queryKey: [...ACTIVITY_LOGS_QUERY_KEY],
    queryFn: getActivityLogs,
    columns: activityLogColumns,
    urlKey: URL_KEY,
    initialSorts: ACTIVITY_LOG_DEFAULT_SORTS,
    initialFilters: FILTERS,
    filtersUsable: dateRangeFiltersUsable,
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
      {/* Annotated, because the grid's row type is not inferred from
          the state it was built with. */}
      <DataTable.Grid
        onRowClick={(row: ActivityLogListRow) => setSelected(row)}
      />
      <DataTable.Pagination />
      {/* Local state, not the URL: the date filter is what a refresh or a
          shared link needs to restore, and an open drawer is not. */}
      <ActivityLogDrawer entry={selected} onClose={() => setSelected(null)} />
    </DataTable.Root>
  );
}
