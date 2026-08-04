import { routePaths } from "@/config/path";
import { createBrowserRouter } from "react-router";
import { ProtectedRoute } from "@/components/routes/protected-route";
import { AppLayoutRoute } from "@/components/layouts/app-layout-route";

export const createRouter = () =>
  createBrowserRouter([
    {
      path: routePaths.auth.login.path,
      lazy: () => import("./routes/auth/login"),
    },
    {
      Component: ProtectedRoute,
      children: [
        {
          Component: AppLayoutRoute,
          children: [
            {
              path: routePaths.dashboard.path,
              lazy: () => import("./routes/app/dashboard"),
            },
            {
              path: routePaths.inventory.services.path,
              lazy: () => import("./routes/app/inventory/services"),
            },
            {
              path: routePaths.inventory.itemCodes.path,
              lazy: () => import("./routes/app/inventory/item-codes"),
            },
            {
              path: routePaths.accounts.seriesReceipts.path,
              lazy: () => import("./routes/app/accounts/series-receipts"),
            },
          ],
        },
      ],
    },
    {
      path: routePaths.notFound.path,
      lazy: () => import("./routes/not-found"),
    },
    { path: "*", lazy: () => import("./routes/not-found") },
  ]);
