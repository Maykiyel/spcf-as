// `Cashier` was defined here until the Transactions list's cashier filter
// became a second consumer of it and of `getCashiers`; both moved to
// `src/api/cashiers.ts` under the promotion rule in CONTEXT.md. Imported
// rather than re-exported: `SeriesReceipt` is the only thing in this
// feature that needs the type, and a re-export nothing imports is a hop
// through this file for no reason.
import type { Cashier } from "@/api/cashiers";

export type SeriesReceipt = {
  id: number;
  account: Cashier; // wire name for "cashier" — see CONTEXT.md
  from: number;
  to: number;
  remaining_sheets: number;
  createdBy: Cashier;
};
