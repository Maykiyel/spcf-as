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
 * No `fields[]` param: the endpoint's default field set is exactly what the
 * table shows, and naming fields explicitly would only add a way for the
 * request to drift out of sync with the columns.
 */
export const getUserAccounts = async (): Promise<UserAccount[]> => {
  const response = await apiClient.get<UserAccount[]>("/users");
  return response.data;
};
