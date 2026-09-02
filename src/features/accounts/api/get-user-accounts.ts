import { apiClient } from "@/lib/axios/api-client";
import type { UserAccount } from "../types";

/** The one query key for the directory. Every mutation on this page
 * invalidates it, so it lives here rather than being retyped per caller. */
export const USER_ACCOUNTS_QUERY_KEY = ["user-accounts"] as const;

/**
 * The whole directory in one response — `/users` is unpaginated and returns
 * every user an admin can see, which is why this page filters, sorts and
 * pages in the browser instead of on the server.
 *
 * No `fields[]` param. The default set is a superset of what the table
 * shows: `first_name` and `last_name` come back unrendered, because the
 * table displays the server-computed `full_name` instead. The two fields
 * the page can't do without aren't `fields[]` values at all — `role` comes
 * from the eager-loaded roles relation, and `is_active` is appended to the
 * select unconditionally. So naming fields would drop two unused strings
 * and add a way for the request to drift from the columns.
 */
export const getUserAccounts = async (): Promise<UserAccount[]> => {
  const response = await apiClient.get<UserAccount[]>("/users");
  return response.data;
};
