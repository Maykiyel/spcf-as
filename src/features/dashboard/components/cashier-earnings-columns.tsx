import type { ColumnDef } from "@/components/ui/data-table";
import { formatCurrency } from "@/utils/currency";
import type { CashierEarnings } from "../types";

/** Both keys are the endpoint's own sort names, which is why header clicks
 * need no mapping. See `get-cashier-earnings.ts` for the row rename. */
export const cashierEarningsColumns: ColumnDef<CashierEarnings>[] = [
  { field: "cashier_name", header: "Cashier" },
  {
    field: "total_earnings",
    header: "Total Earnings",
    render: (row) => formatCurrency(row.total_earnings),
  },
];
