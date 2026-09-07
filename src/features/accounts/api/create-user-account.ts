import { z } from "zod";
import { apiClient } from "@/lib/axios/api-client";
import type { UserAccount } from "../types";

/** Advisory only: the server validates the password as `required|string`
 * and nothing more, so anything calling the API directly can still send
 * one character. A backend rule has been asked for. */
const PASSWORD_MIN_LENGTH = 8;

/**
 * Field names are the request's own, not camelCase: Laravel keys its 422
 * `errors` bag by request field, so matching them is what lets "username
 * has already been taken" land on the username input unaided.
 *
 * No `email` field, because the column no longer exists.
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
