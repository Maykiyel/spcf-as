// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { screen, renderWithQueryClient } from "@/test/render";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/features/auth/types";
import { getDashboardToday } from "../api/get-dashboard-today";
import { DashboardPage } from "./dashboard-page";

// Seam: the page component with its fetchers mocked at the module
// boundary and the auth store stubbed to pick the role. What each role
// sees, and — the part that matters most — which requests each role's
// dashboard actually issues. The admin-only endpoints answer a cashier
// with a 403, so "the cashier branch never calls them" is the decision
// keeping a forbidden response off the app's landing page.

vi.mock("../api/get-dashboard-today");
const mockGetDashboardToday = vi.mocked(getDashboardToday);

const cashier: AuthUser = {
  id: 7,
  first_name: "Jaypee",
  last_name: "Pahayahay",
  full_name: "Jaypee Pahayahay",
  user_name: "jaypee",
  email: "jaypee@spcf.edu.ph",
  role: "cashier",
};

const admin: AuthUser = {
  id: 99,
  first_name: "Mike",
  last_name: "Bautista",
  full_name: "Mike Bautista",
  user_name: "mike",
  email: "mike@spcf.edu.ph",
  role: "admin",
};

function signIn(user: AuthUser) {
  useAuthStore.setState({ user, status: "authenticated" });
}

function renderPage() {
  return renderWithQueryClient(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDashboardToday.mockResolvedValue({
      earnings_today: 1250,
      transactions_today: 8,
    });
  });

  describe("today's figures", () => {
    it("shows a cashier their own day", async () => {
      signIn(cashier);
      renderPage();

      expect(await screen.findByText("₱1,250.00")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("shows an admin the same two figures", async () => {
      signIn(admin);
      renderPage();

      expect(await screen.findByText("₱1,250.00")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("labels the tiles plainly", async () => {
      signIn(cashier);
      renderPage();

      await screen.findByText("₱1,250.00");
      expect(screen.getByText("Transactions Today")).toBeInTheDocument();
      expect(screen.getByText("Earnings Today")).toBeInTheDocument();
    });

    it("shows its own error message when the figures fail", async () => {
      mockGetDashboardToday.mockRejectedValue(new Error("boom"));
      signIn(cashier);
      renderPage();

      expect(
        await screen.findByText("Couldn't load today's figures."),
      ).toBeInTheDocument();
    });
  });
});
