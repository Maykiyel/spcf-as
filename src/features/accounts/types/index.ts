import type { Role } from "@/features/auth/types";

/**
 * One user account in the admin directory.
 *
 * Same wire resource as `AuthUser` (both are the API's `UserResource`), but
 * deliberately a separate type: this is a record being administered, not the
 * signed-in user's own identity, and the two drift apart the moment either
 * side gains a field the other shouldn't have. They now have.
 *
 * **`username`, not the wire's `user_name`.** A `ColumnDef`'s `key` picks
 * the field a cell reads *and* is the word sent as `sort` when its header
 * is clicked. `/users` allow-lists `username`, so a column keyed
 * `user_name` would render correctly and answer the first sort click with
 * a 400. `get-user-accounts.ts` renames it on the way in, the same way
 * `get-cashier-earnings.ts` does. `AuthUser` keeps `user_name`: it is not
 * a table row and has no sort to satisfy. A side effect is that the
 * request field and this response field now agree, where they used to be
 * asymmetric.
 *
 * `role` is required. `UserResource.role` is `whenLoaded('roles')`, and
 * backend `4955f19` briefly dropped the eager load the index needs for it,
 * which left the field absent from every row; `e660349` put it back. So
 * the field is only as reliable as that one line — see `BACKEND_NOTES.md`.
 *
 * There is no `email`. The column was dropped from the `users` table and
 * the field from `UserResource`, both in `4955f19`.
 *
 * `is_active` arrives as a real boolean: the model casts it, as of backend
 * `e355837`.
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
