import { Outlet } from "react-router";
import AppLayout from "./app-layout";

export function AppLayoutRoute() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
