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
        // Deliberately outside AppLayoutRoute: no sidebar or header in
        // this tree, so the app chrome cannot reach the printed output.
        // Note this does NOT cover toasts — <Notifications /> mounts in
        // MantineProvider above AppRouter, so it is in this page's tree
        // regardless of route structure and is excluded by the .no-print
        // class instead (see src/index.css). Still under ProtectedRoute,
        // so it stays auth-gated.
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
