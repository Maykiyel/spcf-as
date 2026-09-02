import type { Role } from "@/features/auth/types";

/**
 * One user account in the admin directory.
 *
 * Same wire resource as `AuthUser` (both are the API's `UserResource`), but
 * deliberately a separate type: this is a record being administered, not the
 * signed-in user's own identity, and the two drift apart the moment either
 * side gains a field the other shouldn't have.
 *
 * `is_active` arrives as a real boolean: the directory endpoint selects the
 * column and the model casts it, both as of backend `e355837`. Before that
 * it was absent from every row here, which is why `BACKEND_NOTES.md` says
 * more about this one field than the rest put together.
 */
export type UserAccount = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  user_name: string;
  email: string;
  role: Role;
  is_active: boolean;
};
