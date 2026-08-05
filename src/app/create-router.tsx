import { createBrowserRouter } from "react-router";
import { ProtectedRoute } from "@/components/routes/protected-route";
import { AppLayoutRoute } from "@/components/layouts/app-layout-route";
import { pages, isPageGroup, LOGIN_PATH } from "@/config/pages";

const leaves = pages.flatMap((entry) =>
  isPageGroup(entry) ? entry.children : [entry],
);

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
