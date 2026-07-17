import { createBrowserRouter, RouterProvider } from "react-router";

export const createRouter = () =>
  createBrowserRouter([
    {
      path: "/",
      lazy: () => import("./routes/landing"),
    },
    {
      path: "*",
      lazy: () => import("./routes/not-found"),
    },
  ]);

export const AppRouter = () => {
  const router = createRouter();
  return <RouterProvider router={router} />;
};
