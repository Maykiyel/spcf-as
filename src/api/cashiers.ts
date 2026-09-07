import { apiClient } from "@/lib/axios/api-client";

// Shared by Series Receipts' assignment picker and the transactions cashier
// filter. See CONTEXT.md's `src/api/` entry for the promotion rule.
export type Cashier = {
  id: number;
  full_name: string;
};

export type CashiersOptions = {
  /** Active only when assigning a series receipt, since
   * `POST /series-receipts` 403s on an inactive cashier. The transactions
   * filter wants everyone: a deactivated cashier's past transactions still
   * exist, and finding them is the likeliest reason to use it. */
  activeOnly?: boolean;
};

/** Distinct keys per variant. One key would let the narrower answer serve
 * the filter, which fails silently by offering fewer cashiers than exist. */
export const cashiersQueryKey = ({ activeOnly = false }: CashiersOptions = {}) =>
  ["cashiers", activeOnly ? "active" : "all"] as const;

/**
 * The cashiers on record. **Admin only** (`viewAny` on User), so a caller
 * has to be a component a cashier never mounts, not one whose result is
 * merely hidden from them.
 *
 * `is_active` is a top-level param rather than `filter[is_active]`, and is
 * omitted entirely for the unnarrowed list. See BACKEND_NOTES.md.
 */
export const getCashiers = async ({
  activeOnly = false,
}: CashiersOptions = {}): Promise<Cashier[]> => {
  const response = await apiClient.get<Cashier[]>("/cashiers", {
    params: activeOnly ? { is_active: 1 } : {},
  });
  return response.data;
};
