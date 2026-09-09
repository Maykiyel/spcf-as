// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { notifications } from "@mantine/notifications";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { getServiceBreakdown } from "../api/get-service-breakdown";
import { getService } from "../api/get-service";
import type { ServiceBreakdownRow } from "../types";
import { ServiceBreakdownPage } from "./service-breakdown-page";

// Seam: the page component, with the breakdown fetcher and the service
// fetcher mocked at the module boundary.

vi.mock("../api/get-service-breakdown");
vi.mock("../api/get-service");
const mockGetBreakdownFor = vi.mocked(getServiceBreakdown);
const mockGetService = vi.mocked(getService);

/** The fetcher the factory hands back, which is what the table calls. */
const mockFetch = vi.fn();

// A factory, not a bare `vi.mock`: automock would empty `toApiDate` and
// `currentMonthRange`, and the default period is read through the latter.
vi.mock("@/components/ui/date-range", async () => {
  const actual =
    await vi.importActual<typeof import("@/components/ui/date-range")>(
      "@/components/ui/date-range",
    );
  return {
    ...actual,
    // Mantine's picker popover never opens under jsdom.
    DateRangeFilter: ({
      onChange,
    }: {
      onChange: (value: { from: string | null; to: string | null }) => void;
    }) => (
      <button onClick={() => onChange({ from: "2026-06-01", to: "2026-06-30" })}>
        Pick range
      </button>
    ),
  };
});

// jsdom implements no ResizeObserver; Mantine's Select subscribes to one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

Element.prototype.scrollIntoView = vi.fn();

const rows: ServiceBreakdownRow[] = [
  {
    control_id: 1201,
    cashier: { id: 7, full_name: "Jaypee Pahayahay" },
    series_number: 4501,
    customer_name: "Anna Reyes",
    total: 1500,
    amount_paid: 2000,
    change_amount: 500,
    date: "2026-08-24T06:30:00.000000Z",
  },
  {
    control_id: 1202,
    cashier: null,
    series_number: null,
    customer_name: "Ben Santos",
    total: 750,
    amount_paid: 750,
    change_amount: 0,
    date: "2026-08-25T01:15:00.000000Z",
  },
];

const page = (data: ServiceBreakdownRow[]) => ({ data, total: data.length });

const lastRequest = () => mockFetch.mock.calls.at(-1)![0];

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">{`${location.pathname}${location.search}`}</div>
  );
}

const currentLocation = () => screen.getByTestId("location").textContent;

const BREAKDOWN_URL =
  "/reports/services-sold/12?breakdown_from_date=2026-08-01&breakdown_to_date=2026-08-31";

/** Through a real route, since the page reads its service id from the path. */
function renderPage(initialEntry = BREAKDOWN_URL) {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/reports/services-sold/:serviceId"
          element={<ServiceBreakdownPage />}
        />
        <Route
          path="/reports/services-sold"
          element={<div>Summary page</div>}
        />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

const tableRows = () => within(screen.getByRole("table"));

function clickSortHeader(header: string) {
  const cell = screen.getByRole("columnheader", { name: new RegExp(header) });
  fireEvent.click(within(cell).getByText(header));
}

/** Past the debounce in `useTableControls` and then some. Fixed rather than
 * `waitFor`, because the assertion it guards is about a request that must
 * never happen. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 600));

beforeEach(() => {
  // Only `Date` is faked, so the debounce and RTL's waiting still run on
  // real timers.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 8, 9) });
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(page(rows));
  mockGetBreakdownFor.mockReturnValue(mockFetch);
  mockGetService.mockResolvedValue({
    id: 12,
    name: "Guidance Fee",
    price: 50,
    description: null,
    is_active: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  notifications.clean();
});

describe("ServiceBreakdownPage — the rows", () => {
  it("renders the transactions behind the figure, with payer, cashier and total", async () => {
    renderPage();

    expect(await screen.findByText("Anna Reyes")).toBeInTheDocument();

    const row = tableRows().getByText("Anna Reyes").closest("tr")!;
    expect(within(row).getByText("Jaypee Pahayahay")).toBeInTheDocument();
    expect(within(row).getByText("4501")).toBeInTheDocument();
    expect(within(row).getByText("₱1,500.00")).toBeInTheDocument();
  });

  it("links a row to the transaction it reports on", async () => {
    renderPage();

    expect(await screen.findByRole("link", { name: "1201" })).toHaveAttribute(
      "href",
      "/transactions/1201",
    );
  });

  it("asks the endpoint for the service in the path", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    expect(mockGetBreakdownFor).toHaveBeenCalledWith(12);
  });

  it("says nothing was sold rather than reading as a failure", async () => {
    mockFetch.mockResolvedValue(page([]));
    renderPage();

    expect(await screen.findByText("No entries found")).toBeInTheDocument();
  });

  it("says the breakdown failed when the request errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network down"));
    renderPage();

    expect(
      await screen.findByText("Couldn't load data. Please try again."),
    ).toBeInTheDocument();
  });
});

describe("ServiceBreakdownPage — the heading", () => {
  it("names the service, which neither the route nor the rows carry", async () => {
    renderPage();

    expect(
      await screen.findByText("Service Breakdown: Guidance Fee"),
    ).toBeInTheDocument();
  });

  it("keeps the plain title when the service lookup fails", async () => {
    // A table that loaded must not be blanked by the heading's own request.
    mockGetService.mockRejectedValue(new Error("Network down"));
    renderPage();

    expect(await screen.findByText("Anna Reyes")).toBeInTheDocument();
    expect(screen.getByText("Service Breakdown")).toBeInTheDocument();
  });
});

describe("ServiceBreakdownPage — the period", () => {
  it("sends the period the URL carries", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    // Story 11: the detail matches the summary it was reached from.
    expect(lastRequest()).toMatchObject({
      filters: { from_date: "2026-08-01", to_date: "2026-08-31" },
    });
  });

  it("still sends both dates on a link that carries none", async () => {
    // Both are `required` on this endpoint, so an absent range is a 422
    // rather than an unfiltered request.
    renderPage("/reports/services-sold/12");
    await screen.findByText("Anna Reyes");

    expect(lastRequest()).toMatchObject({
      filters: { from_date: "2026-09-01", to_date: "2026-09-30" },
    });
  });

  it("asks for nothing while a hand-edited URL blanks one end", async () => {
    renderPage(
      "/reports/services-sold/12?breakdown_from_date=&breakdown_to_date=2026-08-31",
    );
    await flush();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByText("No entries found")).toBeInTheDocument();
  });

  it("asks for nothing when a URL carries an empty range", async () => {
    // Both ends empty reads as a matched pair to the looser guard, and this
    // endpoint requires them besides.
    renderPage(
      "/reports/services-sold/12?breakdown_from_date=&breakdown_to_date=",
    );
    await flush();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByText("No entries found")).toBeInTheDocument();
  });

  it("sends a range picked on this page", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    fireEvent.click(screen.getByRole("button", { name: "Pick range" }));

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { from_date: "2026-06-01", to_date: "2026-06-30" },
      }),
    );
  });
});

describe("ServiceBreakdownPage — the sort", () => {
  it("asks for the endpoint's own default sort on a fresh visit", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    // `id` is the whole of this endpoint's `defaultSort`, and is unique, so
    // it needs no tiebreaker of its own.
    expect(lastRequest().sorts).toContainEqual({ key: "id", direction: "asc" });
  });

  it("orders by the series column, which this endpoint allows and the report does not", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    clickSortHeader("Series No.");

    // Position, not membership. `id` is unique, so leaving the declared
    // sort at priority 1 would make this click reorder nothing.
    await waitFor(() =>
      expect(lastRequest().sorts).toEqual([
        { key: "series_number", direction: "asc" },
      ]),
    );
  });

  it("orders by the cashier column, under the wire's own name", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    clickSortHeader("Cashier");

    await waitFor(() =>
      expect(lastRequest().sorts).toEqual([
        { key: "cashier_name", direction: "asc" },
      ]),
    );
  });
});

describe("ServiceBreakdownPage — getting back", () => {
  it("returns to the summary carrying the period it was reached with", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    fireEvent.click(screen.getByRole("link", { name: /Back to Services Sold/ }));

    // Story 14: an admin checking several services in turn should not
    // re-pick the period each time.
    expect(currentLocation()).toBe(
      "/reports/services-sold?services_sold_from_date=2026-08-01&services_sold_to_date=2026-08-31",
    );
  });
});
