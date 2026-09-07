import { apiClient } from "@/lib/axios/api-client";

// Shared across features (Series Receipts' assignment picker + the
// Transactions list's cashier filter) — see CONTEXT.md's `src/api/` entry.
// Both the shape and the fetcher are promoted here, unlike `services.ts`,
// because both features want the same call and not merely the same type.
//
// It moved out of `features/series-receipts/api/` when the second consumer
// appeared, which is the rule that tier states: promote once a second real
// feature actually needs it, not before.
export type Cashier = {
  id: number;
  full_name: string;
};

export type CashiersOptions = {
  /** Narrow to cashiers who can still be assigned work.
   *
   * The two consumers want opposite answers, which is why this is a
   * parameter rather than the fixed `is_active=1` this call carried while
   * Series Receipts was its only caller:
   *
   * - **Assigning a series receipt: active only.** `POST /series-receipts`
   *   refuses an inactive cashier with a 403 (`Cannot assign Series
   *   Receipt to inactive cashier account`), so offering one is a dead end
   *   the admin can only discover by submitting. Deactivating a cashier
   *   also suspends the series they already hold, which makes assigning
   *   them a new one incoherent rather than merely refused.
   * - **Filtering transactions: everyone.** A deactivated cashier's past
   *   transactions still exist, and an admin looking for them is the
   *   likeliest reason to reach for that filter at all.
   */
  activeOnly?: boolean;
};

/** Distinct keys per variant, because the two answers are different lists.
 * One key would let whichever page mounted first serve its rows to the
 * other, and the narrower answer reaching the filter is silent — it just
 * offers fewer cashiers than exist. */
export const cashiersQueryKey = ({ activeOnly = false }: CashiersOptions = {}) =>
  ["cashiers", activeOnly ? "active" : "all"] as const;

/**
 * The cashiers on record.
 *
 * `GET /cashiers` (backend `29b913d`) exists for this: an unpaginated
 * array of `{id, full_name}` ordered by name, with an `is_active`
 * parameter that narrows it. This used to ask `/users` for
 * `filter[role]=cashier` and `fields[]=full_name`; that route is now
 * paginated, drops `fields[]`, and answers in an envelope, so the old call
 * returned an object where an array was expected.
 *
 * **Admin only** — the endpoint runs `authorize('viewAny', User::class)`,
 * so a cashier gets a 403. Every caller is behind an admin-only page or an
 * admin-only control, and must stay that way: a query that only an admin
 * may run has to be in a component a cashier never mounts, not one whose
 * result is merely hidden from them.
 *
 * `is_active` is sent as a plain query parameter, not `filter[is_active]`.
 * `/cashiers` validates it as `['sometimes', 'boolean']` at the top level,
 * unlike every `filter[...]` key elsewhere in this API — see
 * `BACKEND_NOTES.md`. `1` rather than `true` for the same reason
 * `get-active-services.ts` sends `1`: it is what the rule takes and what
 * the column compares. Omitted entirely for the unnarrowed list, because
 * the endpoint branches on the parameter's presence.
 */
export const getCashiers = async ({
  activeOnly = false,
}: CashiersOptions = {}): Promise<Cashier[]> => {
  const response = await apiClient.get<Cashier[]>("/cashiers", {
    params: activeOnly ? { is_active: 1 } : {},
  });
  return response.data;
};
