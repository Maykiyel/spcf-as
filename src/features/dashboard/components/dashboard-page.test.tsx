// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import { fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { screen, renderWithQueryClient } from "@/test/render";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/features/auth/types";
import { getDashboardToday } from "../api/get-dashboard-today";
import { getCashierEarnings } from "../api/get-cashier-earnings";
import { getMonthlyEarnings } from "../api/get-monthly-earnings";
import { getTransactions } from "@/features/transactions/api/get-transactions";
import type { TransactionListRow } from "@/features/transactions/types";
import { DashboardPage } from "./dashboard-page";

// Seam: the page component, fetchers mocked and the auth store stubbed to
// pick the role. The part that matters is which requests each role
// issues: the admin-only endpoints 403 a cashier, so "the cashier branch
// never calls them" is what keeps that off the landing page.

vi.mock("../api/get-dashboard-today");
const mockGetDashboardToday = vi.mocked(getDashboardToday);

vi.mock("../api/get-cashier-earnings", async () => {
  // A factory, not a bare `vi.mock`: automock empties exported arrays, so
  // this module's sort plan would silently become a table with no sort.
  const actual = await vi.importActual<typeof import("../api/get-cashier-earnings")>("../api/get-cashier-earnings");
  return { ...actual, getCashierEarnings: vi.fn() };
});
const mockGetCashierEarnings = vi.mocked(getCashierEarnings);

vi.mock("../api/get-monthly-earnings");
const mockGetMonthlyEarnings = vi.mocked(getMonthlyEarnings);

vi.mock("@/features/transactions/api/get-transactions", async () => {
  // Factory again, for the same reason: this module's sort plan is what
  // makes Date the declared sort.
  const actual = await vi.importActual<
    typeof import("@/features/transactions/api/get-transactions")
  >("@/features/transactions/api/get-transactions");
  return { ...actual, getTransactions: vi.fn() };
});
const mockGetTransactions = vi.mocked(getTransactions);

// recharts measures its container, and jsdom reports every element as
// zero by zero, so the real chart renders empty whatever it is handed.
// Standing in for it is the only way to assert on the series.
vi.mock("@mantine/charts", () => ({
  BarChart: (props: {
    data: { month: string; total_earnings: number }[];
  }) => (
    <div
      data-testid="bar-chart"
      data-months={props.data.map((point) => point.month).join(",")}
      data-values={props.data.map((point) => point.total_earnings).join(",")}
    />
  ),
}));

// jsdom implements no ResizeObserver; Mantine's ScrollArea subscribes
// to one on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

// jsdom implements no scrolling, and Mantine's Combobox scrolls its active
// option into view on open. Without this a Select throws as an unhandled
// rejection: every test stays green and the run exits non-zero.
Element.prototype.scrollIntoView = vi.fn();

const cashier: AuthUser = {
  id: 7,
  first_name: "Jaypee",
  last_name: "Pahayahay",
  full_name: "Jaypee Pahayahay",
  user_name: "jaypee",
  role: "cashier",
};

const admin: AuthUser = {
  id: 99,
  first_name: "Mike",
  last_name: "Bautista",
  full_name: "Mike Bautista",
  user_name: "mike",
  role: "admin",
};

function signIn(user: AuthUser) {
  useAuthStore.setState({ user, status: "authenticated" });
}

/** `MemoryRouter` keeps its history off `window.location`, so a navigation
 * has to be read through the router — `state` included. */
function LocationProbe() {
  const location = useLocation();
  return (
    <span
      data-testid="location"
      data-from={(location.state as { from?: string } | null)?.from ?? ""}
    >
      {location.pathname}
    </span>
  );
}

function renderPage(url = "/dashboard") {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[url]}>
      <DashboardPage />
      <LocationProbe />
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

const CURRENT_YEAR = new Date().getFullYear();

/** Twelve entries, zero-filled, exactly as the endpoint sends them. Only
 * two months earned anything, which is the case the chart has to render
 * honestly rather than by dropping the other ten. */
const monthlyEarnings = Array.from({ length: 12 }, (_, index) => ({
  month: `${CURRENT_YEAR}-${String(index + 1).padStart(2, "0")}`,
  total_earnings: index === 0 ? 4500 : index === 7 ? 1200 : 0,
}));

/** The second row is cancelled deliberately: the section shows those. */
const recentTransactions: TransactionListRow[] = [
  {
    control_id: 1201,
    cashier: { id: 7, full_name: "Jaypee Pahayahay" },
    series_number: 4501,
    customer_name: "Juan Dela Cruz",
    total: 1500,
    amount_paid: 2000,
    change_amount: 500,
    status: "completed",
    date: "2026-08-24T06:30:00.000000Z",
    items: [{ id: 11, name: "SHS GRADUATION FEE" }],
  },
  {
    control_id: 1202,
    cashier: { id: 7, full_name: "Jaypee Pahayahay" },
    series_number: null,
    customer_name: "Maria Santos",
    total: 300,
    amount_paid: 0,
    change_amount: 0,
    status: "cancelled",
    date: "2026-08-23T01:05:00.000000Z",
    items: [{ id: 12, name: "ID REPLACEMENT" }],
  },
];

/** The last params the table's fetcher was called with. `keepPreviousData`
 * means the previous call's rows stay on screen while the next request is
 * in flight, so asserting on the first call would read the state before
 * the interaction under test. */
function lastEarningsParams() {
  const calls = mockGetCashierEarnings.mock.calls;
  return calls[calls.length - 1][0];
}

/** Opens the year Select and returns its options. Two jsdom quirks, both
 * Mantine's Popover: the closed list shares the input's label, hence
 * `selector: "input"`; and it keeps `display: none` even when expanded,
 * hence `hidden: true` and `fireEvent`. */
async function openYearSelect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByLabelText("Year", { selector: "input" }),
  );
  return screen.findAllByRole("option", { hidden: true });
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDashboardToday.mockResolvedValue({
      earnings_today: 1250,
      transactions_today: 8,
    });
    mockGetCashierEarnings.mockResolvedValue(cashierEarnings);
    mockGetMonthlyEarnings.mockResolvedValue(monthlyEarnings);
    mockGetTransactions.mockResolvedValue({
      data: recentTransactions,
      total: 2,
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
        await screen.findByText("Couldn't load today's figures. Please try again."),
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

    it("orders by highest earnings first", async () => {
      signIn(admin);
      renderPage();

      await screen.findByText("Jaypee Pahayahay");
      // The endpoint would apply this itself given no sort. It is sent
      // anyway so the header carries a caret, rather than the rows being
      // ordered by a column that looks unsorted.
      expect(lastEarningsParams().sorts).toEqual([
        { key: "total_earnings", direction: "desc" },
      ]);
    });

    it("marks Total Earnings as the sorted column", async () => {
      signIn(admin);
      renderPage();

      const header = await screen.findByRole("columnheader", {
        name: /total earnings/i,
      });
      expect(header).toHaveAttribute("aria-sort", "descending");
      expect(
        screen.getByRole("columnheader", { name: /cashier/i }),
      ).toHaveAttribute("aria-sort", "none");
    });

    it("sorts by cashier name", async () => {
      signIn(admin);
      renderPage();

      fireEvent.click(await screen.findByText("Cashier"));

      // `cashier_name`, not `full_name`: a column's key is both what the
      // cell reads and what the sort click sends, and the endpoint
      // allow-lists `cashier_name`.
      //
      // It replaces the declared earnings sort rather than joining behind
      // it. This used to join, which read as a free tiebreaker here and as
      // a dead header on the tables whose default does not tie. #126.
      await waitFor(() =>
        expect(lastEarningsParams().sorts).toEqual([
          { key: "cashier_name", direction: "asc" },
        ]),
      );
    });

    it("still composes earnings with cashier name, asked for in two clicks", async () => {
      signIn(admin);
      renderPage();

      // Clicking the declared column first takes the table off its default,
      // so the second click joins instead of replacing — the pair the old
      // join-behind rule produced on one click is still reachable.
      fireEvent.click(await screen.findByText("Total Earnings"));
      await waitFor(() =>
        expect(lastEarningsParams().sorts).toEqual([
          { key: "total_earnings", direction: "asc" },
        ]),
      );

      fireEvent.click(screen.getByText("Cashier"));
      await waitFor(() =>
        expect(lastEarningsParams().sorts).toEqual([
          { key: "total_earnings", direction: "asc" },
          { key: "cashier_name", direction: "asc" },
        ]),
      );
    });

    it("toggles the earnings sort rather than cycling it off", async () => {
      signIn(admin);
      renderPage();

      // It is the declared sort, so a click reverses it and never sends
      // nothing — the rows would come back in the endpoint's own order
      // with no header admitting to it.
      fireEvent.click(await screen.findByText("Total Earnings"));
      await waitFor(() =>
        expect(lastEarningsParams().sorts).toEqual([
          { key: "total_earnings", direction: "asc" },
        ]),
      );

      fireEvent.click(screen.getByText("Total Earnings"));
      await waitFor(() =>
        expect(lastEarningsParams().sorts).toEqual([
          { key: "total_earnings", direction: "desc" },
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
        screen.getByText("Couldn't load today's figures. Please try again."),
      ).toBeInTheDocument();
    });
  });

  describe("monthly earnings", () => {
    it("charts all twelve months, empty ones included", async () => {
      signIn(admin);
      renderPage();

      const chart = await screen.findByTestId("bar-chart");
      expect(chart).toHaveAttribute(
        "data-months",
        "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec",
      );
      expect(chart).toHaveAttribute(
        "data-values",
        "4500,0,0,0,0,0,0,1200,0,0,0,0",
      );
    });

    it("does not request monthly earnings for a cashier", async () => {
      signIn(cashier);
      renderPage();

      await screen.findByText("₱1,250.00");
      expect(mockGetMonthlyEarnings).not.toHaveBeenCalled();
      expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    });

    it("asks for the current year first", async () => {
      signIn(admin);
      renderPage();

      await screen.findByTestId("bar-chart");
      expect(mockGetMonthlyEarnings).toHaveBeenCalledWith(CURRENT_YEAR);
    });

    it("offers only the years the endpoint accepts", async () => {
      const user = userEvent.setup();
      signIn(admin);
      renderPage();

      const options = await openYearSelect(user);

      // `min:2026` on the endpoint's side, and next year at the top. Both
      // bounds are the server's; the control exists so a 422 cannot be
      // reached from the UI.
      const expected: string[] = [];
      for (let year = 2026; year <= CURRENT_YEAR + 1; year += 1) {
        expected.push(String(year));
      }
      expect(options.map((option) => option.textContent)).toEqual(expected);
    });

    it("refetches when the year changes", async () => {
      const user = userEvent.setup();
      signIn(admin);
      renderPage();

      const options = await openYearSelect(user);
      const nextYear = options.find(
        (option) => option.textContent === String(CURRENT_YEAR + 1),
      );
      fireEvent.click(nextYear!);

      await waitFor(() =>
        expect(mockGetMonthlyEarnings).toHaveBeenCalledWith(CURRENT_YEAR + 1),
      );
    });

    it("restores the year from the URL", async () => {
      signIn(admin);
      renderPage(`/dashboard?year=${CURRENT_YEAR + 1}`);

      await screen.findByTestId("bar-chart");
      expect(mockGetMonthlyEarnings).toHaveBeenCalledWith(CURRENT_YEAR + 1);
    });

    it("ignores a year the endpoint would refuse", async () => {
      signIn(admin);
      renderPage("/dashboard?year=1999");

      await screen.findByTestId("bar-chart");
      expect(mockGetMonthlyEarnings).toHaveBeenCalledWith(CURRENT_YEAR);
      expect(mockGetMonthlyEarnings).not.toHaveBeenCalledWith(1999);
    });

    it("shows its own error message without disturbing the rest", async () => {
      mockGetMonthlyEarnings.mockRejectedValue(new Error("boom"));
      signIn(admin);
      renderPage();

      expect(
        await screen.findByText("Couldn't load monthly earnings. Please try again."),
      ).toBeInTheDocument();
      expect(screen.getByText("₱1,250.00")).toBeInTheDocument();
      expect(screen.getByText("Jaypee Pahayahay")).toBeInTheDocument();
    });
  });

  describe("recent transactions", () => {
    it("shows a cashier their own most recent transactions", async () => {
      signIn(cashier);
      renderPage();

      expect(await screen.findByText("Juan Dela Cruz")).toBeInTheDocument();
      expect(screen.getByText("Recent Transactions")).toBeInTheDocument();
      expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    });

    it("asks once for five rows, newest first, and filters nothing", async () => {
      signIn(cashier);
      renderPage();

      await screen.findByText("Juan Dela Cruz");
      expect(mockGetTransactions).toHaveBeenCalledTimes(1);
      // The whole object: a stray filter would not change a row on screen.
      expect(mockGetTransactions).toHaveBeenCalledWith({
        page: 1,
        per_page: 5,
        search: undefined,
        sorts: [{ key: "created_at", direction: "desc" }],
        filters: {},
      });
    });

    it("trims the columns to what a cashier's own row needs", async () => {
      signIn(cashier);
      renderPage();

      await screen.findByText("Juan Dela Cruz");
      // No Cashier (every row is the viewer) and no Items (the widest).
      expect(
        within(screen.getByRole("table"))
          .getAllByRole("columnheader")
          .map((header) => header.textContent),
      ).toEqual([
        "Date",
        "Control ID",
        "Series No.",
        "Payer",
        "Total",
        "Status",
      ]);
    });

    it("opens the transaction whose row was clicked", async () => {
      signIn(cashier);
      renderPage();

      fireEvent.click(await screen.findByText("Juan Dela Cruz"));

      const location = screen.getByTestId("location");
      expect(location).toHaveTextContent("/transactions/1201");
      // `dashboard`, so the detail page's Back names where it lands. #129.
      expect(location).toHaveAttribute("data-from", "dashboard");
    });

    it("shows its own error message without blanking the tiles above it", async () => {
      mockGetTransactions.mockRejectedValue(new Error("boom"));
      signIn(cashier);
      renderPage();

      expect(
        await screen.findByText("Couldn't load data. Please try again."),
      ).toBeInTheDocument();
      expect(screen.getByText("₱1,250.00")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("links out to the full list", async () => {
      signIn(cashier);
      renderPage();

      await screen.findByText("Juan Dela Cruz");
      expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
        "href",
        "/transactions/receipts",
      );
    });

    it("does not show an admin a section about their own rows", async () => {
      signIn(admin);
      renderPage();

      await screen.findByText("Jaypee Pahayahay");
      expect(screen.queryByText("Recent Transactions")).not.toBeInTheDocument();
    });

    it("does not request transactions for an admin", async () => {
      signIn(admin);
      renderPage();

      await screen.findByText("Jaypee Pahayahay");
      expect(mockGetTransactions).not.toHaveBeenCalled();
    });
  });
});
