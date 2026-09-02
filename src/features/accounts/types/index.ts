import type { Role } from "@/features/auth/types";

/**
 * One user account in the admin directory.
 *
 * Same wire resource as `AuthUser` (both are the API's `UserResource`), but
 * deliberately a separate type: this is a record being administered, not the
 * signed-in user's own identity, and the two drift apart the moment either
 * side gains a field the other shouldn't have.
 *
 * **`is_active` is absent on purpose.** `GET /users` selects a fixed column
 * list that doesn't include it, and `UserResource` omits null values, so no
 * row from the directory endpoint carries an active status at all. See
 * `BACKEND_NOTES.md` — the column, and the activate/deactivate action, wait
 * on a backend change.
 */
export type UserAccount = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  user_name: string;
  email: string;
  role: Role;
};
