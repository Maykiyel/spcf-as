import { routePaths } from "@/config/path";
import { createBrowserRouter, RouterProvider } from "react-router";

export const createRouter = () =>
  createBrowserRouter([
    {
      path: routePaths.auth.login.path,
      children: [
        {
          index: true,
          lazy: () => import("./routes/auth/login"),
        },
        {
          path: "*",
          lazy: () => import("./routes/not-found"),
        },
      ],
    },
    {
      path: routePaths.dashboard.path,
      lazy: () => import("./routes/app/dashboard"),
    },
  ]);

export const AppRouter = () => {
  const router = createRouter();
  return <RouterProvider router={router} />;
};
