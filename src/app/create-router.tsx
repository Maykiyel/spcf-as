import { routePaths } from "@/config/path";
import { createBrowserRouter } from "react-router";
import { ProtectedRoute } from "@/components/routes/protected-route";

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
          path: routePaths.dashboard.path,
          lazy: () => import("./routes/app/dashboard"),
        },
      ],
    },
    {
      path: "*",
      lazy: () => import("./routes/not-found"),
    },
  ]);
