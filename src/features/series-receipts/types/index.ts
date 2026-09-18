// `Cashier` was defined here until the Transactions list's cashier filter
// became a second consumer of it and of `getCashiers`; both moved to
// `src/api/cashiers.ts` under the promotion rule in CONTEXT.md. Imported
// rather than re-exported: `SeriesReceipt` is the only thing in this
// feature that needs the type, and a re-export nothing imports is a hop
// through this file for no reason.
import type { Cashier } from "@/api/cashiers";

// The backend's own four cases (`SeriesReceiptResource`), unchanged on the
// wire. `suspended` is the one an account deactivation causes and a
// reactivation clears — see CONTEXT.md.
export const SERIES_RECEIPT_STATUSES = [
  "queued",
  "active",
  "exhausted",
  "suspended",
] as const;

export type SeriesReceiptStatus = (typeof SERIES_RECEIPT_STATUSES)[number];

export type SeriesReceipt = {
  id: number;
  cashier: Cashier; // `account` on the wire, renamed in `getSeriesReceipts`
  from: number;
  to: number;
  remaining_sheets: number;
  status: SeriesReceiptStatus;
  createdBy: Cashier;
};
