import { RouterProvider } from "react-router";
import { createRouter } from "./create-router";

export const AppRouter = () => {
  const router = createRouter();
  return <RouterProvider router={router} />;
};
