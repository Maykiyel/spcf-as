// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Notifications, notifications } from "@mantine/notifications";
import { render, screen } from "@/test/render";
import { useAuthStore } from "@/stores/auth-store";
import { LOGIN_PATH } from "@/config/pages";
import { ProtectedRoute } from "./protected-route";
import type { AuthUser } from "@/features/auth/types";

// Seam: the router tree rendered through ProtectedRoute — asserting on
// what's on screen (where a refused navigation lands, vs. the target
// page's own content), never on pages.ts internals or ProtectedRoute's
// implementation.
//
// `<Notifications />` is mounted alongside the router so the explanation
// that accompanies a forbidden redirect is asserted the way a user meets
// it — as text on screen — rather than by spying on the toast module.
// Mantine's notification store is module-level and outlives RTL's
// unmount, so it has to be emptied between tests as well: without that a
// toast raised by one test is still queued when the next test mounts its
// own `<Notifications />`, and every later assertion on that text finds
// two elements.

const cashier: AuthUser = {
  id: 1,
  first_name: "Cash",
  last_name: "Ier",
  full_name: "Cash Ier",
  user_name: "cashier1",
  role: "cashier",
};

const admin: AuthUser = {
  ...cashier,
  id: 2,
  user_name: "admin1",
  role: "admin",
};

function buildRouter(initialPath: string) {
  return createMemoryRouter(
    [
      { path: LOGIN_PATH, element: <div>Login Page</div> },
      {
        Component: ProtectedRoute,
        children: [
          {
            path: "/reports",
            element: <div>Reports Page</div>,
            handle: { roles: ["admin"] },
          },
          {
            path: "/dashboard",
            element: <div>Dashboard Page</div>,
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
}

function renderAt(initialPath: string) {
  return render(
    <>
      <Notifications />
      <RouterProvider router={buildRouter(initialPath)} />
    </>,
  );
}

describe("ProtectedRoute — role enforcement", () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, status: "idle" });
    notifications.clean();
  });

  it("sends an authenticated user whose role isn't allowed to the dashboard, not the login page", () => {
    useAuthStore.setState({ user: cashier, status: "authenticated" });
    renderAt("/reports");

    expect(screen.queryByText("Reports Page")).toBeNull();
    // The user is signed in. A login screen here reads as an expired
    // session, which is the confusion #67 exists to remove.
    expect(screen.queryByText("Login Page")).toBeNull();
    expect(screen.queryByText("Dashboard Page")).not.toBeNull();
  });

  it("explains why, so the redirect doesn't read as a malfunction", async () => {
    useAuthStore.setState({ user: cashier, status: "authenticated" });
    renderAt("/reports");

    expect(
      await screen.findByText(/don't have access to that page/i),
    ).toBeInTheDocument();
  });

  it("says nothing when the role is allowed", async () => {
    useAuthStore.setState({ user: admin, status: "authenticated" });
    renderAt("/reports");

    await screen.findByText("Reports Page");
    expect(screen.queryByText(/don't have access to that page/i)).toBeNull();
  });

  it("renders normally for a user whose role matches the route", () => {
    useAuthStore.setState({ user: admin, status: "authenticated" });
    renderAt("/reports");

    expect(screen.queryByText("Reports Page")).not.toBeNull();
  });

  it("renders normally for a route with no roles restriction", () => {
    useAuthStore.setState({ user: cashier, status: "authenticated" });
    renderAt("/dashboard");

    expect(screen.queryByText("Dashboard Page")).not.toBeNull();
  });

  it("still sends an unauthenticated user to the login page", () => {
    useAuthStore.setState({ user: null, status: "unauthenticated" });
    renderAt("/dashboard");

    expect(screen.queryByText("Login Page")).not.toBeNull();
  });
});
