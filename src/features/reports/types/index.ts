import type { TransactionScalars } from "@/api/transactions";

/** One row of `GET /reports/transactions`. No item shape at all: the endpoint
 * eager-loads the cashier alone, and `whenLoaded` omits the key rather than
 * sending an empty array. Every row is `completed`, enforced server-side. */
export type TransactionReportRow = TransactionScalars;
