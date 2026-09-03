import {
  DataTable,
  useServerTableState,
  type ColumnDef,
} from "@/components/ui/data-table";
import { formatCurrency } from "@/utils/currency";
import { getCashierEarnings } from "../api/get-cashier-earnings";
import type { CashierEarnings } from "../types";

const URL_KEY = "cashiers";

/** The page size `/reports/cashier-earnings` uses when asked for none.
 * Sent explicitly because `useServerTableState` would otherwise default
 * to 25, which is the app's number rather than this endpoint's. */
const PAGE_SIZE = 5;

// Module scope for the same reason as every other table here: the state
// hook memoises on this array's identity.
//
// Both keys are the endpoint's own sort names. That is what makes the
// header clicks work without any mapping at the call site — see
// `get-cashier-earnings.ts` for why the row is renamed to suit.
const columns: ColumnDef<CashierEarnings>[] = [
  { key: "cashier_name", header: "Cashier", sortable: true },
  {
    key: "total_earnings",
    header: "Total Earnings",
    sortable: true,
    render: (row) => formatCurrency(row.total_earnings),
  },
];

/**
 * Who collected what, admin-only.
 *
 * Rendered only on the admin branch, and it holds its own query, so a
 * cashier's dashboard never issues this request. `/reports/*` is behind
 * `role:admin` and would answer them with a 403.
 *
 * **No toolbar.** `DataTable.Search` would need a `filter[search]` the
 * reports endpoints do not accept, and a page-size control would let an
 * admin pull 100 cashiers onto a dashboard whose whole point is a glance.
 * Paging at the endpoint's own five is the behaviour the spec asks for.
 *
 * **No sort is sent until one is clicked**, which is how the default lands
 * on highest earnings first: that is the endpoint's own `-total_earnings`,
 * and duplicating it here would be this page owning a default twice.
 */
export function CashierEarningsTable() {
  const tableState = useServerTableState({
    // Inline, like every other server-backed table here: nothing
    // invalidates this key, because the dashboard has no mutations.
    queryKey: ["cashier-earnings"],
    queryFn: getCashierEarnings,
    columns,
    initialPageSize: PAGE_SIZE,
    urlKey: URL_KEY,
  });

  return (
    <DataTable.Root title="Cashier Earnings" state={tableState}>
      <DataTable.Grid />
      <DataTable.Pagination />
    </DataTable.Root>
  );
}
