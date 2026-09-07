import type { Role } from "@/features/auth/types";

/**
 * One user account in the admin directory. Same wire resource as
 * `AuthUser`, kept separate because the two have already diverged.
 *
 * `username`, not the wire's `user_name`: a `ColumnDef`'s `key` is also the
 * word sent as `sort`, and `/users` allow-lists `username`, so the wire
 * name would render fine and 400 on the first sort click.
 */
export type UserAccount = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  username: string;
  role: Role;
  is_active: boolean;
};
