import {
  DataTable,
  useServerTableState,
  type ColumnDef,
} from "@/components/ui/data-table";
import { formatCurrency } from "@/utils/currency";
import {
  getCashierEarnings,
  CASHIER_EARNINGS_SORT_PLAN,
} from "../api/get-cashier-earnings";
import type { CashierEarnings } from "../types";

const URL_KEY = "cashiers";

/** The page size `/reports/cashier-earnings` uses when asked for none.
 * Sent explicitly because `useServerTableState` would otherwise default
 * to 25, which is the app's number rather than this endpoint's. */
const PAGE_SIZE = 5;

// Both keys are the endpoint's own sort names, which is why header clicks
// need no mapping. See `get-cashier-earnings.ts` for the row rename.
const columns: ColumnDef<CashierEarnings>[] = [
  { field: "cashier_name", header: "Cashier" },
  {
    field: "total_earnings",
    header: "Total Earnings",
    render: (row) => formatCurrency(row.total_earnings),
  },
];

/**
 * Who collected what, admin-only. Holds its own query and renders only on
 * the admin branch, so a cashier's dashboard never issues the request.
 *
 * No toolbar: the reports endpoints accept no `filter[search]`, and a
 * page-size control would pull 100 cashiers onto a dashboard meant for a
 * glance. The endpoint's default order is declared, not left implicit, so
 * the header carries a caret.
 */
export function CashierEarningsTable() {
  const tableState = useServerTableState({
    // Inline, like every other server-backed table here: nothing
    // invalidates this key, because the dashboard has no mutations.
    queryKey: ["cashier-earnings"],
    queryFn: getCashierEarnings,
    columns,
    initialPageSize: PAGE_SIZE,
    sortPlan: CASHIER_EARNINGS_SORT_PLAN,
    urlKey: URL_KEY,
  });

  return (
    <DataTable.Root title="Cashier Earnings" state={tableState}>
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
