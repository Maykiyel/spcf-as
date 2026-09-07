import {
  createListAdapter,
  type ServerTableParams,
  type ServerTableResponse,
} from "@/components/ui/data-table";
import type { UserAccount } from "../types";

/** The directory's cache prefix, which every mutation here invalidates.
 * `useServerTableState` appends page, size, sorts and filters, so it stays
 * a prefix. */
export const USER_ACCOUNTS_QUERY_KEY = ["user-accounts"] as const;

/** The row as `GET /users` sends it: `UserAccount` with the wire's own
 * `user_name` in place of the renamed `username`. */
type UserAccountWireRow = Omit<UserAccount, "username"> & {
  user_name: string;
};

const listUserAccounts = createListAdapter<UserAccountWireRow>(
  "/users",
  "users",
);

/**
 * One page of the directory, server-backed like every other table here.
 *
 * No `supportsSearch`: `/users` accepts none, and an unknown filter key is
 * a 400, which is why the page has no search box either. Renames
 * `user_name` to `username` so the column's `key` is the word the endpoint
 * allow-lists as a sort. See the note on `UserAccount`.
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
