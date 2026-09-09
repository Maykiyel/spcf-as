import { TRANSACTION_REPORT_SORT_PLAN } from "../api/get-transaction-report";
import { reportTransactionColumns } from "./report-transaction-columns";

/** The columns of `GET /reports/transactions`. Which of them sort, and
 * under what names, comes from the endpoint's plan. */
export const transactionReportColumns = reportTransactionColumns({
  plan: TRANSACTION_REPORT_SORT_PLAN,
  includeAmounts: true,
});
