// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { fireEvent, waitFor } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/features/auth/types";
import { getDashboardToday } from "../api/get-dashboard-today";
import { getCashierEarnings } from "../api/get-cashier-earnings";
import { DashboardPage } from "./dashboard-page";

// Seam: the page component with its fetchers mocked at the module
// boundary and the auth store stubbed to pick the role. What each role
// sees, and — the part that matters most — which requests each role's
// dashboard actually issues. The admin-only endpoints answer a cashier
// with a 403, so "the cashier branch never calls them" is the decision
// keeping a forbidden response off the app's landing page.

vi.mock("../api/get-dashboard-today");
const mockGetDashboardToday = vi.mocked(getDashboardToday);

vi.mock("../api/get-cashier-earnings");
const mockGetCashierEarnings = vi.mocked(getCashierEarnings);

// `DataTable.Grid` wraps its table in a Mantine ScrollArea, which
// subscribes to a ResizeObserver on mount. jsdom doesn't implement one.
// Same stub as manage-accounts-page.test.tsx.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

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

const cashierEarnings = {
  data: [
    { id: 7, cashier_name: "Jaypee Pahayahay", total_earnings: 9400 },
    { id: 4, cashier_name: "Noli Cruz", total_earnings: 3120 },
  ],
  total: 11,
};

/** The last params the table's fetcher was called with. `keepPreviousData`
 * means the previous call's rows stay on screen while the next request is
 * in flight, so asserting on the first call would read the state before
 * the interaction under test. */
function lastEarningsParams() {
  const calls = mockGetCashierEarnings.mock.calls;
  return calls[calls.length - 1][0];
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDashboardToday.mockResolvedValue({
      earnings_today: 1250,
      transactions_today: 8,
    });
    mockGetCashierEarnings.mockResolvedValue(cashierEarnings);
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

  describe("cashier earnings", () => {
    it("shows an admin who collected what", async () => {
      signIn(admin);
      renderPage();

      expect(await screen.findByText("Jaypee Pahayahay")).toBeInTheDocument();
      expect(screen.getByText("₱9,400.00")).toBeInTheDocument();
      expect(screen.getByText("Noli Cruz")).toBeInTheDocument();
    });

    it("does not show a cashier other cashiers' earnings", async () => {
      signIn(cashier);
      renderPage();

      await screen.findByText("₱1,250.00");
      expect(screen.queryByText("Cashier Earnings")).not.toBeInTheDocument();
    });

    it("does not request cashier earnings for a cashier", async () => {
      signIn(cashier);
      renderPage();

      await screen.findByText("₱1,250.00");
      expect(mockGetCashierEarnings).not.toHaveBeenCalled();
    });

    it("leaves the default order to the endpoint", async () => {
      signIn(admin);
      renderPage();

      await screen.findByText("Jaypee Pahayahay");
      // No sort is sent, so `/reports/cashier-earnings` applies its own
      // `-total_earnings`. Sending one from here would be this page
      // asserting a default the endpoint already owns.
      expect(lastEarningsParams().sorts).toEqual([]);
    });

    it("sorts by cashier name", async () => {
      signIn(admin);
      renderPage();

      fireEvent.click(await screen.findByText("Cashier"));

      // `cashier_name`, not `full_name`: a column's key is both what the
      // cell reads and what the sort click sends, and the endpoint
      // allow-lists `cashier_name`.
      await waitFor(() =>
        expect(lastEarningsParams().sorts).toEqual([
          { key: "cashier_name", direction: "asc" },
        ]),
      );
    });

    it("sorts by earnings", async () => {
      signIn(admin);
      renderPage();

      fireEvent.click(await screen.findByText("Total Earnings"));

      await waitFor(() =>
        expect(lastEarningsParams().sorts).toEqual([
          { key: "total_earnings", direction: "asc" },
        ]),
      );
    });

    it("pages", async () => {
      signIn(admin);
      renderPage();

      await screen.findByText("Jaypee Pahayahay");
      expect(lastEarningsParams().per_page).toBe(5);

      fireEvent.click(screen.getByRole("button", { name: "2" }));

      await waitFor(() => expect(lastEarningsParams().page).toBe(2));
    });

    it("still renders when today's figures fail", async () => {
      mockGetDashboardToday.mockRejectedValue(new Error("boom"));
      signIn(admin);
      renderPage();

      expect(await screen.findByText("Jaypee Pahayahay")).toBeInTheDocument();
      expect(
        screen.getByText("Couldn't load today's figures."),
      ).toBeInTheDocument();
    });
  });
});
