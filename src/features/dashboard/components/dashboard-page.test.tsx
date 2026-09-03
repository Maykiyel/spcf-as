// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { screen, renderWithQueryClient } from "@/test/render";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/features/auth/types";
import { getDashboardToday } from "../api/get-dashboard-today";
import { getCashierEarnings } from "../api/get-cashier-earnings";
import { getMonthlyEarnings } from "../api/get-monthly-earnings";
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

vi.mock("../api/get-monthly-earnings");
const mockGetMonthlyEarnings = vi.mocked(getMonthlyEarnings);

// recharts measures its container to lay anything out, and jsdom reports
// every element as zero by zero — so the real BarChart renders an empty
// box whatever it is handed. Standing in for it is the only way to assert
// on the series that reaches the chart, which is the part with a decision
// in it: twelve months, zero-earning ones included.
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

// `DataTable.Grid` wraps its table in a Mantine ScrollArea, which
// subscribes to a ResizeObserver on mount. jsdom doesn't implement one.
// Same stub as manage-accounts-page.test.tsx.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

// Mantine's Combobox scrolls its active option into view when the
// dropdown opens. jsdom implements no scrolling at all, so without this
// the year Select throws — and it throws *outside* the assertion, as an
// unhandled rejection, which leaves every test green while the run exits
// non-zero. Worth knowing: a passing test count is not the gate.
Element.prototype.scrollIntoView = vi.fn();

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

function renderPage(url = "/dashboard") {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[url]}>
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

const CURRENT_YEAR = new Date().getFullYear();

/** Twelve entries, zero-filled, exactly as the endpoint sends them. Only
 * two months earned anything, which is the case the chart has to render
 * honestly rather than by dropping the other ten. */
const monthlyEarnings = Array.from({ length: 12 }, (_, index) => ({
  month: `${CURRENT_YEAR}-${String(index + 1).padStart(2, "0")}`,
  total_earnings: index === 0 ? 4500 : index === 7 ? 1200 : 0,
}));

/** The last params the table's fetcher was called with. `keepPreviousData`
 * means the previous call's rows stay on screen while the next request is
 * in flight, so asserting on the first call would read the state before
 * the interaction under test. */
function lastEarningsParams() {
  const calls = mockGetCashierEarnings.mock.calls;
  return calls[calls.length - 1][0];
}

/** Opens the year Select and returns its options.
 *
 * Two jsdom quirks, both Mantine's Popover rather than anything here.
 * The options list stays in the DOM while closed and is labelled by the
 * same label as the input, so the label alone matches two elements —
 * hence `selector: "input"`. And the dropdown never loses `display: none`
 * even once `aria-expanded` is `true`, because floating-ui measures every
 * element as zero by zero, so the options are only reachable with
 * `hidden: true` and can only be chosen with `fireEvent`, which does not
 * refuse an element it believes nobody can point at. */
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
      // It joins the declared earnings sort as the tiebreaker rather than
      // replacing it — two columns is the documented cap, so neither is
      // evicted.
      await waitFor(() =>
        expect(lastEarningsParams().sorts).toEqual([
          { key: "total_earnings", direction: "desc" },
          { key: "cashier_name", direction: "asc" },
        ]),
      );
    });

    it("cycles the earnings sort off and back round", async () => {
      signIn(admin);
      renderPage();

      // The column starts descending, so the first click takes it off
      // rather than reversing it — that is `nextSorts`' asc, desc, gone
      // cycle entered at its last step.
      fireEvent.click(await screen.findByText("Total Earnings"));
      await waitFor(() => expect(lastEarningsParams().sorts).toEqual([]));

      fireEvent.click(screen.getByText("Total Earnings"));
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
});
