import { Divider } from "@mantine/core";
import {
  DataTable,
  useServerTableState,
  dateRangeFiltersRequired,
  type TableFilters,
} from "@/components/ui/data-table";
import { DateRangeTableFilter } from "@/components/filters";
import { getServicesSold } from "../api/get-services-sold";
import { SERVICES_SOLD_QUERY_KEY } from "../api/reports-query-keys";
import { SERVICES_SOLD_URL_KEY } from "../lib/services-sold-routes";
import { useReportPeriod } from "../lib/use-report-period";
import {
  servicesSoldColumns,
  SERVICES_SOLD_DEFAULT_SORTS,
} from "./services-sold-columns";

/**
 * The Services Sold Report, one row per service for a period.
 *
 * The current-month default is load-bearing: the drill-down requires both
 * dates, so an unfiltered summary would render unopenable rows. See #65.
 */
export function ServicesSoldPage() {
  const { defaults, current } = useReportPeriod(SERVICES_SOLD_URL_KEY);

  const initialFilters: TableFilters = {
    from_date: defaults.from,
    to_date: defaults.to,
  };

  const tableState = useServerTableState({
    queryKey: [...SERVICES_SOLD_QUERY_KEY],
    queryFn: getServicesSold,
    columns: servicesSoldColumns(current),
    urlKey: SERVICES_SOLD_URL_KEY,
    initialSorts: SERVICES_SOLD_DEFAULT_SORTS,
    // `service_name` is unique, so a revenue click joining behind it would
    // reorder nothing.
    initialSortsAreTotalOrder: true,
    initialFilters,
    // The stricter guard, because every row here links somewhere that
    // requires both dates.
    filtersUsable: dateRangeFiltersRequired,
  });

  return (
    <DataTable.Root title="Services Sold Report" state={tableState}>
      <DateRangeTableFilter
        filters={tableState.filters}
        onChange={tableState.setFilters}
      />
      <Divider />
      <DataTable.Toolbar>
        <DataTable.PageSize />
      </DataTable.Toolbar>
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
