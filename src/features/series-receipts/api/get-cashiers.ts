import { apiClient } from "@/lib/axios/api-client";
import type { Cashier } from "../types";

/** Sent as a plain query parameter, not `filter[is_active]`. `/cashiers`
 * validates it as `['sometimes', 'boolean']` at the top level, unlike
 * every `filter[...]` key elsewhere in this API — see `BACKEND_NOTES.md`.
 * `1` rather than `true` for the same reason `get-active-services.ts`
 * sends `1`: it is what the rule takes and what the column compares. */
const ACTIVE_ONLY = 1;

/**
 * The cashiers a series receipt may be assigned to, for the form's picker.
 *
 * **Active only.** `POST /series-receipts` refuses an inactive cashier
 * with a 403 (`Cannot assign Series Receipt to inactive cashier account`),
 * so offering one is a dead end the admin can only discover by submitting.
 * Deactivating a cashier also suspends the series they already hold, which
 * makes assigning them a new one incoherent rather than merely refused.
 *
 * `GET /cashiers` (backend `29b913d`) exists for this: an unpaginated
 * array of `{id, full_name}` ordered by name, with the `is_active`
 * parameter that narrows it. This used to ask `/users` for
 * `filter[role]=cashier` and `fields[]=full_name`; that route is now
 * paginated, drops `fields[]`, and answers in an envelope, so the old call
 * returned an object where an array was expected.
 */
export const getCashiers = async (): Promise<Cashier[]> => {
  const response = await apiClient.get<Cashier[]>("/cashiers", {
    params: { is_active: ACTIVE_ONLY },
  });
  return response.data;
};
