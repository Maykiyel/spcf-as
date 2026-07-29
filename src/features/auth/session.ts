import { login as loginRequest, type LoginInput } from "./api/login";
import { apiClient } from "@/lib/axios/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "./types";

export const authSession = {
  async login(input: LoginInput): Promise<void> {
    const user = await loginRequest(input);
    useAuthStore.getState().setUser(user);
  },

  async restore(): Promise<void> {
    useAuthStore.getState().setChecking();
    try {
      const response = await apiClient.get<AuthUser>("/users/me");
      useAuthStore.getState().setUser(response.data);
    } catch {
      useAuthStore.getState().setUnauthenticated();
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/logout");
    } finally {
      useAuthStore.getState().setUnauthenticated();
    }
  },
};
