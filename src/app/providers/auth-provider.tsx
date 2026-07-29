import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { AppLoader } from "@/components/ui/loader";
import { setUnauthorizedHandler } from "@/lib/axios/api-client";
import { authSession } from "@/features/auth/session";

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      useAuthStore.getState().setUnauthenticated();
    });
    authSession.restore();
  }, []);

  if (status === "idle" || status === "checking") {
    return <AppLoader />;
  }

  return <>{children}</>;
};
