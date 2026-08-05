import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/stores/auth-store";
import { LOGIN_PATH } from "@/config/pages";
import { Suspense } from "react";
import { AppLoader } from "../ui/loader";

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === "unauthenticated") {
    return (
      <Navigate
        to={LOGIN_PATH}
        replace
        state={{ from: location }}
      />
    );
  }

  return (
    <Suspense fallback={<AppLoader />}>
      <Outlet />
    </Suspense>
  );
}
