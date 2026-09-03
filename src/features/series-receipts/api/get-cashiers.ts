import { apiClient } from "@/lib/axios/api-client";
import type { Cashier } from "../types";

/**
 * Every cashier, for the series-receipt form's picker.
 *
 * `GET /cashiers` (backend `29b913d`) exists for exactly this: it returns
 * an unpaginated array of `{id, full_name}` ordered by name, which is the
 * whole shape the picker needs. This used to ask `/users` for
 * `filter[role]=cashier` and `fields[]=full_name`; that route is now
 * paginated, drops `fields[]`, and answers everything in an envelope, so
 * the old call returns an object where an array is expected.
 *
 * The endpoint takes an optional `is_active` — a plain query parameter,
 * not a `filter[...]` one. It is deliberately not sent: `/users` never
 * filtered by it either, so the picker offers the same people it always
 * has. Narrowing it to active cashiers is a real improvement, because
 * `POST /series-receipts` refuses an inactive one with a 403, but it is a
 * behaviour change and does not belong in a migration.
 */
export const getCashiers = async (): Promise<Cashier[]> => {
  const response = await apiClient.get<Cashier[]>("/cashiers");
  return response.data;
};
