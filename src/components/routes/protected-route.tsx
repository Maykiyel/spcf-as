import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/stores/auth-store";
import { routePaths } from "@/config/path";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
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
