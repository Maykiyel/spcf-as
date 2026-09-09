// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import { notifications } from "@mantine/notifications";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { getServicesSold } from "../api/get-services-sold";
import type { ServiceSoldRow } from "../types";
import { ServicesSoldPage } from "./services-sold-page";

// Seam: the page component, with the summary fetcher mocked at the module
// boundary. The sort the fetcher itself appends is pinned separately, in
// `get-services-sold.test.ts`, since it is applied past this mock.

vi.mock("../api/get-services-sold", async () => {
  // A factory, not a bare `vi.mock`: automock empties exported arrays, so
  // this module's sort plan would silently become a table with no sort.
  const actual = await vi.importActual<typeof import("../api/get-services-sold")>("../api/get-services-sold");
  return { ...actual, getServicesSold: vi.fn() };
});
const mockGetSummary = vi.mocked(getServicesSold);

// A factory, not a bare `vi.mock`: automock would empty `toApiDate` and
// `currentMonthRange`, and the default period is read through the latter.
vi.mock("@/components/ui/date-range", async () => {
  const actual =
    await vi.importActual<typeof import("@/components/ui/date-range")>(
      "@/components/ui/date-range",
    );
  return {
    ...actual,
    // Mantine's picker popover never opens under jsdom, so the shared
    // control is stood in for by buttons emitting fixed ranges.
    DateRangeFilter: ({
      onChange,
    }: {
      onChange: (value: { from: string | null; to: string | null }) => void;
    }) => (
      <>
        <button
          onClick={() => onChange({ from: "2026-08-01", to: "2026-08-31" })}
        >
          Pick range
        </button>
        <button onClick={() => onChange({ from: null, to: null })}>
          Clear range
        </button>
      </>
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

const rows: ServiceSoldRow[] = [
  {
    service: { id: 12, name: "Guidance Fee" },
    total_quantity: 1240,
    subtotal: 62000,
  },
  {
    service: { id: 31, name: "Athletic Fee" },
    total_quantity: 310,
    subtotal: 15500,
  },
];

const page = (data: ServiceSoldRow[]) => ({ data, total: data.length });

const lastRequest = () => mockGetSummary.mock.calls.at(-1)![0];

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">{`${location.pathname}${location.search}`}</div>
  );
}

const currentLocation = () => screen.getByTestId("location").textContent;

function renderPage(initialEntry = "/reports/services-sold") {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ServicesSoldPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

/** The rows themselves, so an assertion about the list can't be satisfied
 * by the same text appearing in a filter above the table. */
const tableRows = () => within(screen.getByRole("table"));

/** The sort control is a button *inside* the header cell, so the click has
 * to be scoped to the cell and aimed at its text. */
function clickSortHeader(header: string) {
  const cell = screen.getByRole("columnheader", { name: new RegExp(header) });
  fireEvent.click(within(cell).getByText(header));
}

/** Past the debounce in `useTableControls` and then some. Fixed rather than
 * `waitFor`, because the assertion it guards is about a request that must
 * never happen. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 600));

beforeEach(() => {
  // Only `Date` is faked, so the debounce in `useTableControls` and RTL's
  // own waiting still run on real timers.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 8, 9) });
  vi.clearAllMocks();
  mockGetSummary.mockResolvedValue(page(rows));
});

afterEach(() => {
  vi.useRealTimers();
  notifications.clean();
});

describe("ServicesSoldPage — the rows", () => {
  it("renders a row per service, with the quantity and the revenue", async () => {
    renderPage();

    expect(await screen.findByText("Guidance Fee")).toBeInTheDocument();

    const row = tableRows().getByText("Guidance Fee").closest("tr")!;
    expect(within(row).getByText("1,240")).toBeInTheDocument();
    expect(within(row).getByText("₱62,000.00")).toBeInTheDocument();
  });

  it("offers no search box, because the endpoint has no search filter", async () => {
    renderPage();
    await screen.findByText("Guidance Fee");

    // An unknown `filter[]` key is a 400 here, not an ignored parameter.
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });

  it("shows a dash rather than a dead link when a row carries no service", async () => {
    // `whenLoaded` drops the key rather than sending null, so the fixture
    // omits it.
    mockGetSummary.mockResolvedValue(
      page([{ total_quantity: 4, subtotal: 200 }]),
    );
    renderPage();

    await screen.findByText("₱200.00");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("says nothing sold rather than reading as a failure", async () => {
    mockGetSummary.mockResolvedValue(page([]));
    renderPage();

    expect(await screen.findByText("No entries found")).toBeInTheDocument();
  });

  it("says the report failed rather than showing an empty period", async () => {
    mockGetSummary.mockRejectedValue(new Error("Network down"));
    renderPage();

    expect(
      await screen.findByText("Couldn't load data. Please try again."),
    ).toBeInTheDocument();
  });
});

describe("ServicesSoldPage — the sort", () => {
  it("sends an explicit service-name sort before the user touches anything", async () => {
    renderPage();
    await screen.findByText("Guidance Fee");

    // The endpoint is a grouped aggregate with no `defaultSort`, so an
    // unsorted request paginates unstably. `toContainEqual`, since a
    // declared default stays in the array.
    expect(lastRequest().sorts).toContainEqual({
      key: "service_name",
      direction: "asc",
    });
  });

  it("ranks by revenue on one click, rather than behind the declared sort", async () => {
    renderPage();
    await screen.findByText("Guidance Fee");

    clickSortHeader("Revenue");

    // Position, not membership. `service_name` is unique, so leaving it at
    // priority 1 would make this click reorder nothing at all.
    await waitFor(() =>
      expect(lastRequest().sorts).toEqual([
        { key: "subtotal", direction: "asc" },
      ]),
    );
  });

  it("ranks by quantity on one click, under the wire's own name", async () => {
    renderPage();
    await screen.findByText("Guidance Fee");

    clickSortHeader("Quantity Sold");

    await waitFor(() =>
      expect(lastRequest().sorts).toEqual([
        { key: "total_quantity", direction: "asc" },
      ]),
    );
  });

  it("still adds a second column once the user has chosen the first", async () => {
    // The declared sort is superseded, not the ordinary two-column
    // behaviour: a click after the first still joins.
    renderPage();
    await screen.findByText("Guidance Fee");

    clickSortHeader("Revenue");
    await waitFor(() => expect(lastRequest().sorts).toHaveLength(1));
    clickSortHeader("Quantity Sold");

    await waitFor(() =>
      expect(lastRequest().sorts).toEqual([
        { key: "subtotal", direction: "asc" },
        { key: "total_quantity", direction: "asc" },
      ]),
    );
  });

  it("makes the declared column a two-state header", async () => {
    renderPage();
    await screen.findByText("Guidance Fee");

    clickSortHeader("Service");

    await waitFor(() =>
      expect(lastRequest().sorts).toEqual([
        { key: "service_name", direction: "desc" },
      ]),
    );

    clickSortHeader("Service");

    // Never off. The endpoint orders by `service_id` given no sort, which
    // is neither alphabetical nor a column anyone can see.
    await waitFor(() =>
      expect(lastRequest().sorts).toEqual([
        { key: "service_name", direction: "asc" },
      ]),
    );
  });
});

describe("ServicesSoldPage — the period", () => {
  it("defaults the period to the current month", async () => {
    renderPage();
    await screen.findByText("Guidance Fee");

    // Load-bearing, not cosmetic: every row links somewhere that requires
    // both dates.
    expect(lastRequest()).toMatchObject({
      filters: { from_date: "2026-09-01", to_date: "2026-09-30" },
    });
  });

  it("sends both ends of a picked range", async () => {
    renderPage();
    await screen.findByText("Guidance Fee");

    fireEvent.click(screen.getByRole("button", { name: "Pick range" }));

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { from_date: "2026-08-01", to_date: "2026-08-31" },
      }),
    );
  });

  it("returns to the current month when the range is cleared", async () => {
    renderPage();
    await screen.findByText("Guidance Fee");
    fireEvent.click(screen.getByRole("button", { name: "Pick range" }));
    await waitFor(() =>
      expect(lastRequest().filters).toMatchObject({ from_date: "2026-08-01" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear range" }));

    // Not an unfiltered view: clearing writes the default back, because a
    // summary with no period would render rows nothing can open.
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { from_date: "2026-09-01", to_date: "2026-09-30" },
      }),
    );
  });

  it("asks for nothing when a URL carries an empty range", async () => {
    // Both ends empty reads as a matched pair to the looser guard, and
    // `filter[from_date]=` is a 400 rather than an ignored parameter.
    renderPage(
      "/reports/services-sold?services_sold_from_date=&services_sold_to_date=",
    );
    await flush();

    expect(mockGetSummary).not.toHaveBeenCalled();
    expect(screen.getByText("No entries found")).toBeInTheDocument();
  });

  it("restores a period from the URL", async () => {
    renderPage(
      "/reports/services-sold?services_sold_from_date=2026-07-01&services_sold_to_date=2026-07-31",
    );
    await screen.findByText("Guidance Fee");

    // `Y-m-d` and nothing else; an ISO timestamp is a 422 here.
    expect(lastRequest()).toMatchObject({
      filters: { from_date: "2026-07-01", to_date: "2026-07-31" },
    });
  });
});

describe("ServicesSoldPage — the drill-down link", () => {
  it("links each service to its breakdown, carrying the default period", async () => {
    renderPage();

    expect(
      await screen.findByRole("link", { name: "Guidance Fee" }),
    ).toHaveAttribute(
      "href",
      "/reports/services-sold/12?breakdown_from_date=2026-09-01&breakdown_to_date=2026-09-30",
    );
  });

  it("carries the period the admin actually chose", async () => {
    renderPage();
    await screen.findByText("Guidance Fee");

    fireEvent.click(screen.getByRole("button", { name: "Pick range" }));

    // Story 11: the detail has to match the summary it was reached from.
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Athletic Fee" })).toHaveAttribute(
        "href",
        "/reports/services-sold/31?breakdown_from_date=2026-08-01&breakdown_to_date=2026-08-31",
      ),
    );
  });

  it("navigates to the breakdown route on a click", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("link", { name: "Guidance Fee" }));

    expect(currentLocation()).toBe(
      "/reports/services-sold/12?breakdown_from_date=2026-09-01&breakdown_to_date=2026-09-30",
    );
  });
});
