import { z } from "zod";
import { apiClient } from "@/lib/axios/api-client";
import type { LoginResponse } from "../types";

export const loginInputSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const login = async (data: LoginInput): Promise<LoginResponse> => {
  return apiClient
    .post<LoginResponse, LoginInput>("/login", data)
    .then((response) => response.data);
};
