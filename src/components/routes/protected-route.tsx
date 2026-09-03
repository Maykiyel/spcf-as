import { Navigate, Outlet, useLocation, useMatches } from "react-router";
import { useAuthStore } from "@/stores/auth-store";
import { DASHBOARD_PATH, isAllowedForRole, LOGIN_PATH } from "@/config/pages";
import { Suspense, useEffect } from "react";
import { AppLoader } from "../ui/loader";
import { notifyWarning } from "@/lib/notifications/notifications";
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

  const isUnauthenticated = status === "unauthenticated";

  // The roles themselves, not the handle that carries them — reading
  // `requiredRoles.roles` off something named for the roles is what made
  // the old version hard to follow.
  const requiredRoles = matches
    .map((match) => (match.handle as RouteHandle | undefined)?.roles)
    .find((roles) => roles !== undefined);

  // Signed in and permitted, but not for *this* route. Distinct from
  // being signed out, and distinct again from a deactivated account —
  // which is signed in and permitted, and refused by the server on every
  // request instead (see `authSession.end`).
  //
  // Asks `pages.ts` the membership question rather than repeating it. The
  // registry's two derivations resolve through that function so a hidden
  // link and a reachable route can't disagree; the enforcement point has
  // to resolve through it as well or it is free to drift from both.
  const isForbidden =
    !isUnauthenticated &&
    requiredRoles !== undefined &&
    !isAllowedForRole(requiredRoles, role);

  // Keyed on the path as well, so two forbidden routes in a row each get
  // their own explanation rather than the second passing in silence.
  // Fired from an effect, not during render: the redirect below renders
  // on this same pass, and a toast raised mid-render is a side effect in
  // the render phase.
  useEffect(() => {
    if (!isForbidden) return;
    notifyWarning("You don't have access to that page.");
  }, [isForbidden, location.pathname]);

  if (isUnauthenticated) {
    return (
      <Navigate
        to={LOGIN_PATH}
        replace
        state={{ from: location }}
      />
    );
  }

  // The dashboard, not the login page. The user *is* signed in, and
  // showing them a login screen misrepresents what happened — it reads as
  // an expired session. No `from` state either: nothing sends them back,
  // because nothing about their session is going to change and make that
  // route work.
  if (isForbidden) {
    return <Navigate to={DASHBOARD_PATH} replace />;
  }

  return (
    <Suspense fallback={<AppLoader />}>
      <Outlet />
    </Suspense>
  );
}
