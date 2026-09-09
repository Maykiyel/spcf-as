import { reportTransactionColumns } from "./report-transaction-columns";

/** The columns of `GET /reports/transactions`. Which of them sort comes
 * from `TRANSACTION_REPORT_SORT_PLAN`, applied by the table. */
export const transactionReportColumns = reportTransactionColumns({
  includeAmounts: true,
});
