import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/stores/auth-store";
import { routePaths } from "@/config/path";

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === "unauthenticated") {
    return (
      <Navigate
        to={routePaths.auth.login.path}
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}
