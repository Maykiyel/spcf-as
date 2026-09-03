import {
  createListAdapter,
  type ServerTableParams,
  type ServerTableResponse,
} from "@/components/ui/data-table";
import type { UserAccount } from "../types";

/** The prefix every cache entry for the directory starts with. Every
 * mutation on this page invalidates it, so it lives here rather than being
 * retyped per caller.
 *
 * `useServerTableState` appends the page, size, sorts and filters to it, so
 * this is a prefix rather than a whole key — which is exactly what
 * `invalidateQueries` matches on, so the mutations need no change. */
export const USER_ACCOUNTS_QUERY_KEY = ["user-accounts"] as const;

/** The row as `GET /users` sends it. `role` is absent in practice — the
 * index no longer eager-loads the roles relation — but the resource still
 * declares it, so this stays optional rather than being dropped. */
type UserAccountWireRow = Omit<UserAccount, "username"> & {
  user_name: string;
};

const listUserAccounts = createListAdapter<UserAccountWireRow>(
  "/users",
  "users",
);

/**
 * One page of the directory.
 *
 * `/users` was unpaginated and served the whole directory in one response,
 * which is why this page used to filter, sort and page in the browser.
 * Backend `4955f19` paginated it, put it behind the same
 * `{users, pagination}` envelope as every other list endpoint, and made it
 * admin-only. So the table is server-backed now, like every other one here.
 *
 * No `supportsSearch`. `/users` accepts no `filter[search]`, and an unknown
 * filter key is a 400 rather than an ignored parameter — which is why the
 * page composes no search box either. Its filters are `role` and
 * `is_active`, both declared by the table.
 *
 * Renames `user_name` to `username` on the way in, so the Username column's
 * `key` is the word the endpoint allow-lists as a sort. See the note on
 * `UserAccount`.
 */
export const getUserAccounts = async (
  params: ServerTableParams,
): Promise<ServerTableResponse<UserAccount>> => {
  const response = await listUserAccounts(params);

  return {
    total: response.total,
    data: response.data.map(({ user_name, ...row }) => ({
      ...row,
      username: user_name,
    })),
  };
};
