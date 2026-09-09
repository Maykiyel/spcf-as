import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { tableParamName } from "@/components/ui/data-table";
import { currentMonthRange } from "@/components/ui/date-range";
import type { ReportPeriod } from "./services-sold-routes";

type ReportPeriodState = {
  /** What `initialFilters` takes. Fixed for the life of the mount, because
   * a value equal to it is the one dropped from the URL: derive it from the
   * URL instead and picking the period already showing would erase it. */
  defaults: ReportPeriod;
  /** What the table is showing, for the links that carry it to the other
   * view. Reads the URL the same way `useTableControls` does. */
  current: ReportPeriod;
};

/** The period a Services Sold view is on. One source for both halves, which
 * are read either side of `useServerTableState` and have to agree. */
export function useReportPeriod(urlKey: string): ReportPeriodState {
  const [searchParams] = useSearchParams();
  const defaults = useMemo(() => currentMonthRange(), []);

  return {
    defaults,
    current: {
      from: searchParams.get(tableParamName(urlKey, "from_date")) ?? defaults.from,
      to: searchParams.get(tableParamName(urlKey, "to_date")) ?? defaults.to,
    },
  };
}
