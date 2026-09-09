import { reportTransactionColumns } from "./report-transaction-columns";

/** The columns of `GET /reports/services-sold/{service}`. It shows no
 * amounts, and its plan allows `series_number` where the report's does not. */
export const serviceBreakdownColumns = reportTransactionColumns({
  includeAmounts: false,
});
