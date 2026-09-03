// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { render, screen } from "@/test/render";
import { useAuthStore } from "@/stores/auth-store";
import { LOGIN_PATH } from "@/config/pages";
import { ProtectedRoute } from "./protected-route";
import type { AuthUser } from "@/features/auth/types";

// Seam: the router tree rendered through ProtectedRoute — asserting on
// what's on screen (redirected to the login page vs. the target page's own
// content), never on pages.ts internals or ProtectedRoute's implementation.

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

describe("ProtectedRoute — role enforcement", () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, status: "idle" });
  });

  it("redirects an authenticated user whose role isn't allowed for the route", () => {
    useAuthStore.setState({ user: cashier, status: "authenticated" });
    render(<RouterProvider router={buildRouter("/reports")} />);

    expect(screen.queryByText("Reports Page")).toBeNull();
    expect(screen.queryByText("Login Page")).not.toBeNull();
  });

  it("renders normally for a user whose role matches the route", () => {
    useAuthStore.setState({ user: admin, status: "authenticated" });
    render(<RouterProvider router={buildRouter("/reports")} />);

    expect(screen.queryByText("Reports Page")).not.toBeNull();
  });

  it("renders normally for a route with no roles restriction", () => {
    useAuthStore.setState({ user: cashier, status: "authenticated" });
    render(<RouterProvider router={buildRouter("/dashboard")} />);

    expect(screen.queryByText("Dashboard Page")).not.toBeNull();
  });

  it("still redirects an unauthenticated user (existing behavior unchanged)", () => {
    useAuthStore.setState({ user: null, status: "unauthenticated" });
    render(<RouterProvider router={buildRouter("/dashboard")} />);

    expect(screen.queryByText("Login Page")).not.toBeNull();
  });
});
