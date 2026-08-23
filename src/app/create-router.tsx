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
          children: leaves.map((leaf) => ({
            path: leaf.path,
            lazy: leaf.lazyImport,
            handle: { roles: leaf.roles },
          })),
        },
      ],
    },
    {
      path: "/not-found",
      lazy: () => import("./routes/not-found"),
    },
    { path: "*", lazy: () => import("./routes/not-found") },
  ]);
