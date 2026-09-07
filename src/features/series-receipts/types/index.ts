import type { Cashier } from "@/api/cashiers";

// Promoted to `src/api/cashiers.ts` alongside the fetcher, when the
// Transactions list became a second consumer of both. Re-exported rather
// than repointed at every use site: `SeriesReceipt` below is the reason
// the type exists in this feature's vocabulary, and CONTEXT.md's Cashier
// entry is written about that relation.
export type { Cashier };

export type SeriesReceipt = {
  id: number;
  account: Cashier; // wire name for "cashier" — see CONTEXT.md
  from: number;
  to: number;
  remaining_sheets: number;
  createdBy: Cashier;
};
