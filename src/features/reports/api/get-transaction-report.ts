import { createListAdapter } from "@/components/ui/data-table";
import type { TransactionReportRow } from "../types";

/** `total_earnings` is computed server-side across the whole filtered set, so
 * it is read off the envelope; summing the visible page answers a different
 * question. No `supportsSearch`: an unknown filter key here is a 400. */
export const getTransactionReport = createListAdapter<
  TransactionReportRow,
  number
>("/reports/transactions", "transactions", {
  selectMeta: (body) => body.total_earnings as number,
});
