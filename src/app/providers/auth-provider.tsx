import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { AppLoader } from "@/components/ui/loader";
import {
  setAccountDeactivatedHandler,
  setUnauthorizedHandler,
} from "@/lib/axios/api-client";
import { notifyError } from "@/lib/notifications/notifications";
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
    // A deactivated account keeps a token that still authenticates, so
    // nothing signs the user out on its own — clearing the session here is
    // what sends ProtectedRoute back to the login screen. The toast mounts
    // above the router, so it survives that navigation and is still on
    // screen when they land. The interceptor has already made sure this
    // runs once, however many requests the page had in flight.
    setAccountDeactivatedHandler((message) => {
      useAuthStore.getState().setUnauthenticated();
      // The server's own copy already says the account is deactivated and
      // to ask an admin to reactivate it. It does not auto-close: it is
      // the only explanation the user gets for why they were signed out.
      notifyError(message, {
        title: "Account deactivated",
        autoClose: false,
      });
    });
    authSession.restore();
  }, []);

  if (status === "idle" || status === "checking") {
    return <AppLoader />;
  }

  return <>{children}</>;
};
