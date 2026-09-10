import { Divider } from "@mantine/core";
import { DataTable, useServerTableState } from "@/components/ui/data-table";
import { currentMonthRange } from "@/components/ui/date-range";
import { DateRangeTableFilter } from "@/components/filters";
import {
  getServicesSold,
  SERVICES_SOLD_SORT_PLAN,
} from "../api/get-services-sold";
import { SERVICES_SOLD_QUERY_KEY } from "../api/reports-query-keys";
import { SERVICES_SOLD_URL_KEY } from "../lib/services-sold-routes";
import { servicesSoldColumns } from "./services-sold-columns";

/**
 * The Services Sold Report, one row per service for a period.
 *
 * The current-month default is load-bearing: the drill-down requires both
 * dates, so an unfiltered summary would render unopenable rows. See #65.
 */
export function ServicesSoldPage() {
  const tableState = useServerTableState({
    queryKey: [...SERVICES_SOLD_QUERY_KEY],
    queryFn: getServicesSold,
    // A function: each row links to the breakdown for the period the table
    // is on, which isn't known until the range resolves.
    columns: ({ period }) => servicesSoldColumns(period),
    urlKey: SERVICES_SOLD_URL_KEY,
    sortPlan: SERVICES_SOLD_SORT_PLAN,
    // `required`, because every row here links somewhere that takes both
    // dates; the current-month default is what keeps those rows openable.
    dateRange: { required: true, default: currentMonthRange },
  });

  return (
    <DataTable.Root title="Services Sold Report" state={tableState}>
      <DateRangeTableFilter />
      <Divider />
      <DataTable.Toolbar>
        <DataTable.PageSize />
      </DataTable.Toolbar>
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
