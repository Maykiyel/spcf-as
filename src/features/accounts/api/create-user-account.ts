import { z } from "zod";
import { apiClient } from "@/lib/axios/api-client";
import type { UserAccount } from "../types";

/**
 * Advisory only. The server validates the password as `['required',
 * 'string']` and nothing more, so it accepts a single character today —
 * anything calling the API directly still can. Enforcing a minimum here
 * stops an admin creating a one-character password by hand; it is not a
 * substitute for the backend rule, which has been asked for.
 */
const PASSWORD_MIN_LENGTH = 8;

/**
 * Field names are the request's own, not camelCase. Laravel's 422 body keys
 * its `errors` bag by request field, so naming the form fields the same way
 * is what lets a server-side "username has already been taken" land on the
 * username input without a translation table in between.
 *
 * There is no `email` field. Backend `4955f19` dropped the column from the
 * `users` table and the field from `UserResource`, so there is nowhere for
 * one to go. `POST /users` has not caught up — it still validates `email`
 * as required and still writes it — which means account creation is broken
 * server-side until it does. Sending an email would not rescue it: the
 * write it feeds targets a column that no longer exists, and the
 * `unique:users,email` rule queries it first. See `BACKEND_NOTES.md`.
 */
export const createUserAccountSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(255),
  last_name: z.string().trim().min(1, "Last name is required").max(255),
  username: z.string().trim().min(1, "Username is required").max(255),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    ),
  role: z.enum(["admin", "cashier"]),
});

export type CreateUserAccountInput = z.infer<typeof createUserAccountSchema>;

export const createUserAccount = async (
  data: CreateUserAccountInput,
): Promise<UserAccount> => {
  const response = await apiClient.post<UserAccount, CreateUserAccountInput>(
    "/users",
    data,
  );
  return response.data;
};
