import { z } from "zod";
import { apiClient, getCsrfCookie } from "@/lib/axios/api-client";
import type { AuthUser } from "../types";

export const loginInputSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const login = async (data: LoginInput): Promise<AuthUser> => {
  await getCsrfCookie();
  const response = await apiClient.post<AuthUser, LoginInput>("/login", data);
  return response.data;
};
