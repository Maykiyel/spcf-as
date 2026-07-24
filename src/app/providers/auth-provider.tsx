import { useAuthStore } from "@/stores/auth-store";
import { AppLoader } from "@/components/ui/loader";
import { useEffect } from "react";
import { apiClient } from "@/lib/axios/api-client";
import { type AuthUser } from "@/features/auth/types";

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await apiClient.get<AuthUser>("/users/me");
        useAuthStore.getState().setUser(response.data);
      } catch (error) {
        useAuthStore.getState().setUnauthenticated();
      }
    };

    initializeAuth();
  }, []);

  if (status === "idle" || status === "checking") {
    return <AppLoader />;
  }

  return <>{children}</>;
};
