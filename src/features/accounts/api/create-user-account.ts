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
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Field names are the request's own, not camelCase. Laravel's 422 body keys
 * its `errors` bag by request field, so naming the form fields the same way
 * is what lets a server-side "username has already been taken" land on the
 * username input without a translation table in between.
 *
 * Note the asymmetry with `UserAccount`: the request field is `username`,
 * the response field is `user_name`. That is the API's, not a typo here.
 */
export const createUserAccountSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(255),
  last_name: z.string().trim().min(1, "Last name is required").max(255),
  username: z.string().trim().min(1, "Username is required").max(255),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .max(255)
    .pipe(z.email("Enter a valid email address")),
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
