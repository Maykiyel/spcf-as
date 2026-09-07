// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@mantine/core";
import { MemoryRouter } from "react-router";
import { render, screen } from "@/test/render";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/features/auth/types";
import SidebarLinksContainer from "./sidebar-links-container";

// Seam: the container rendered with the auth store stubbed, asserting on
// the links each role is offered. Nothing here reaches into pages.ts's
// structures — those have their own pure test in src/config/pages.test.ts.
//
// The group labels are rendered by the Accordion controls regardless of
// whether the group is expanded, so an absent group means absent from the
// tree, not merely collapsed.

// Mantine's Popover and Tooltip (both wrap every collapsible group here)
// measure their target through a ResizeObserver, which jsdom doesn't
// implement. Same stub as manage-accounts-page.test.tsx.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const cashier: AuthUser = {
  id: 1,
  first_name: "Cash",
  last_name: "Ier",
  full_name: "Cash Ier",
  user_name: "cashier1",
  role: "cashier",
};

const admin: AuthUser = { ...cashier, id: 2, user_name: "admin1", role: "admin" };

function renderSidebarAs(user: AuthUser) {
  useAuthStore.setState({ user, status: "authenticated" });
  return render(
    <MemoryRouter>
      <AppShell>
        <SidebarLinksContainer />
      </AppShell>
    </MemoryRouter>,
  );
}

describe("SidebarLinksContainer", () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, status: "idle" });
  });

  it("offers New Transaction to a cashier", () => {
    renderSidebarAs(cashier);

    expect(screen.getByText("New Transaction")).toBeInTheDocument();
  });

  it("does not offer New Transaction to an admin", () => {
    renderSidebarAs(admin);

    expect(screen.queryByText("New Transaction")).not.toBeInTheDocument();
  });

  it("keeps the Transactions group and its other pages for both roles", () => {
    renderSidebarAs(admin);

    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(
      screen.getByText("View Transactions (Per Receipt)"),
    ).toBeInTheDocument();

    renderSidebarAs(cashier);

    expect(
      screen.getAllByText("View Transactions (Per Receipt)").length,
    ).toBeGreaterThan(0);
  });

  it("hides the admin-only Accounts group from a cashier entirely", () => {
    renderSidebarAs(cashier);

    expect(screen.queryByText("Accounts")).not.toBeInTheDocument();
    expect(screen.queryByText("Manage Accounts")).not.toBeInTheDocument();
  });

  it("shows the Accounts group to an admin", () => {
    renderSidebarAs(admin);

    expect(screen.getByText("Accounts")).toBeInTheDocument();
    expect(screen.getByText("Manage Accounts")).toBeInTheDocument();
  });

  it("hides an admin-only standalone page from a cashier", () => {
    renderSidebarAs(cashier);

    expect(screen.queryByText("Reports")).not.toBeInTheDocument();
    expect(screen.queryByText("Activity Log")).not.toBeInTheDocument();
  });

  it("shows the Dashboard to everyone", () => {
    renderSidebarAs(cashier);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
