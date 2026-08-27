import { createBrowserRouter } from "react-router";
import { ProtectedRoute } from "@/components/routes/protected-route";
import { AppLayoutRoute } from "@/components/layouts/app-layout-route";
import { getLeafRoutes, LOGIN_PATH } from "@/config/pages";

const leaves = getLeafRoutes();

export const createRouter = () =>
  createBrowserRouter([
    {
      path: LOGIN_PATH,
      lazy: () => import("./routes/auth/login"),
    },
    {
      Component: ProtectedRoute,
      children: [
        {
          Component: AppLayoutRoute,
          children: [
            ...leaves.map((leaf) => ({
              path: leaf.path,
              lazy: leaf.lazyImport,
              handle: { roles: leaf.roles },
            })),
            // Not a nav leaf — no sidebar entry. Reached via navigation
            // (post-confirm) or a direct link (per-receipt list row,
            // bookmark). Still gets full AppShell chrome, so it's a
            // sibling here rather than a pages.ts leaf.
            {
              path: "/transactions/:controlId",
              lazy: () => import("./routes/app/transactions/view"),
            },
          ],
        },
        // Deliberately outside AppLayoutRoute: no sidebar, header, or
        // Notifications mount in this tree, so nothing but the receipt
        // itself can ever end up in the printed output — enforced by
        // route structure, not by print CSS discipline. Still under
        // ProtectedRoute, so it stays auth-gated.
        {
          path: "/transactions/:controlId/print",
          lazy: () => import("./routes/app/transactions/print"),
        },
      ],
    },
    {
      path: "/not-found",
      lazy: () => import("./routes/not-found"),
    },
    { path: "*", lazy: () => import("./routes/not-found") },
  ]);
