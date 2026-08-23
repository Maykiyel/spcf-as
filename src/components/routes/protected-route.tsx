import { Navigate, Outlet, useLocation, useMatches } from "react-router";
import { useAuthStore } from "@/stores/auth-store";
import { LOGIN_PATH } from "@/config/pages";
import { Suspense } from "react";
import { AppLoader } from "../ui/loader";
import type { Role } from "@/features/auth/types";

// Matching routes carry their required roles on `handle` (set in
// create-router.tsx from the same pages.ts `roles` field the sidebar
// already reads) — this is the router's only source for "who can see
// this route", so the sidebar showing/hiding a link is purely cosmetic.
type RouteHandle = { roles?: Role[] };

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();
  const matches = useMatches();

  if (status === "unauthenticated") {
    return (
      <Navigate
        to={LOGIN_PATH}
        replace
        state={{ from: location }}
      />
    );
  }

  const requiredRoles = matches.find(
    (match) => (match.handle as RouteHandle | undefined)?.roles,
  )?.handle as RouteHandle | undefined;

  if (
    requiredRoles?.roles &&
    (!role || !requiredRoles.roles.includes(role))
  ) {
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
