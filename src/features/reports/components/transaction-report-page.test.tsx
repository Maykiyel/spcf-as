// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import { notifications } from "@mantine/notifications";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { getCashiers } from "@/api/cashiers";
import { getTransactionReport } from "../api/get-transaction-report";
import type { TransactionReportRow } from "../types";
import { TransactionReportPage } from "./transaction-report-page";

// Seam: the page component, with the report fetcher and the cashier fetcher
// mocked at the module boundary.

vi.mock("../api/get-transaction-report", async () => {
  // A factory, not a bare `vi.mock`: automock empties exported arrays, so
  // this module's sort plan would silently become a table with no sort.
  const actual = await vi.importActual<
    typeof import("../api/get-transaction-report")
  >("../api/get-transaction-report");
  return { ...actual, getTransactionReport: vi.fn() };
});
const mockGetReport = vi.mocked(getTransactionReport);

// A factory, not a bare `vi.mock`: automock would empty `cashiersQueryKey`'s
// returned array too, and both cashier-list variants would share a key.
vi.mock("@/api/cashiers", async () => {
  const actual =
    await vi.importActual<typeof import("@/api/cashiers")>("@/api/cashiers");
  return { ...actual, getCashiers: vi.fn() };
});
const mockGetCashiers = vi.mocked(getCashiers);

// Mantine's picker popover never opens under jsdom, so the shared control is
// stood in for by a button emitting one fixed range. A factory again, since
// automock would empty `toApiDate` and the URL-restore test reads through it.
vi.mock("@/components/ui/date-range", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/ui/date-range")
  >("@/components/ui/date-range");
  return {
    ...actual,
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

const rows: TransactionReportRow[] = [
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
    cashier: { id: 8, full_name: "Noli Cruz" },
    series_number: 4502,
    customer_name: "Ben Santos",
    total: 750,
    amount_paid: 750,
    change_amount: 0,
    date: "2026-08-25T01:15:00.000000Z",
  },
];

/** The rows visible on this page sum to 2,250. The server's figure covers
 * the whole filtered period, so it deliberately does not match: a page that
 * recomputed the total would print 2,250 here and be caught. */
const SERVER_TOTAL = 48250;

const page = (data: TransactionReportRow[], meta = SERVER_TOTAL) => ({
  data,
  total: data.length,
  meta,
});

const lastRequest = () =>
  mockGetReport.mock.calls[mockGetReport.mock.calls.length - 1][0];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

const currentUrl = () => screen.getByTestId("location").textContent ?? "";

function renderPage(initialEntry = "/reports/transactions") {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TransactionReportPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

/** The rows themselves, so an assertion about the list can't be satisfied by
 * the same text appearing in the total or a filter above it. */
const tableRows = () => within(screen.getByRole("table"));

const reportTotal = () => screen.getByTestId("report-total");

/** Mantine renders its dropdown in a portal keyed by `aria-controls`, so the
 * option is not inside the combobox's own subtree. */
function chooseFromSelect(label: string, optionText: string) {
  const combobox = screen.getByRole("combobox", { name: label });
  fireEvent.click(combobox);

  const dropdown = document.getElementById(
    combobox.getAttribute("aria-controls")!,
  )!;
  fireEvent.click(within(dropdown).getByText(optionText));
}

/** The sort control is a button *inside* the header cell, and "Cashier" also
 * labels a filter above the table, so the click has to be scoped to the cell
 * and aimed at its text. */
function clickSortHeader(header: string) {
  const cell = screen.getByRole("columnheader", { name: new RegExp(header) });
  fireEvent.click(within(cell).getByText(header));
}

beforeEach(() => {
  // Only `Date` is faked, so the debounce in `useTableControls` and RTL's
  // own waiting still run on real timers.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 8, 9) });
  vi.clearAllMocks();
  mockGetReport.mockResolvedValue(page(rows));
  mockGetCashiers.mockResolvedValue([
    { id: 7, full_name: "Jaypee Pahayahay" },
    { id: 8, full_name: "Noli Cruz" },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
  notifications.clean();
});

describe("TransactionReportPage — the rows", () => {
  it("renders a row per transaction, with the money an admin came to check", async () => {
    renderPage();

    expect(await screen.findByText("Anna Reyes")).toBeInTheDocument();
    expect(tableRows().getByText("1201")).toBeInTheDocument();
    expect(tableRows().getByText("Jaypee Pahayahay")).toBeInTheDocument();

    // Total, amount paid and change, scoped to this transaction's own row.
    const row = tableRows().getByText("Anna Reyes").closest("tr")!;
    expect(within(row).getByText("₱1,500.00")).toBeInTheDocument();
    expect(within(row).getByText("₱2,000.00")).toBeInTheDocument();
    expect(within(row).getByText("₱500.00")).toBeInTheDocument();
  });

  it("links a row to the transaction it reports on", async () => {
    renderPage();

    expect(await screen.findByRole("link", { name: "1201" })).toHaveAttribute(
      "href",
      "/transactions/1201",
    );
  });

  it("asks for the newest transaction first on a fresh visit", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    // Both halves of the endpoint's own `defaultSort`. The `id` tiebreaker
    // is what keeps page order defined when two transactions share a
    // `created_at`, and sending any sort suppresses the server's default.
    expect(lastRequest()).toMatchObject({
      page: 1,
      sorts: [
        { key: "created_at", direction: "desc" },
        { key: "id", direction: "asc" },
      ],
      filters: {
        from_date: "2026-09-01",
        to_date: "2026-09-30",
        cashier_id: null,
      },
    });
  });

  it("offers no search box, because /reports/transactions has no search filter", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    // An unknown `filter[]` key is a 400 here, not an ignored parameter.
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });

  it("marks every column sortable under the endpoint's own names", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    // `cashier_name` is allow-listed here and not on `/transactions`, and
    // the response field is `cashier`; a wrong name is a 422 on first click.
    // Position, not membership: `id` in the declared sort is unique, so a
    // click that joined behind it would reorder nothing.
    clickSortHeader("Cashier");

    await waitFor(() =>
      expect(lastRequest().sorts).toEqual([
        { key: "cashier_name", direction: "asc" },
      ]),
    );
  });

  it("sorts the payer column as customer_name, not customer", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    // `/transactions` names this sort `customer`; this endpoint does not.
    clickSortHeader("Payer");

    await waitFor(() =>
      expect(lastRequest().sorts).toEqual([
        { key: "customer_name", direction: "asc" },
      ]),
    );
  });
});

describe("TransactionReportPage — the period total", () => {
  it("shows the server's total, not the sum of the visible rows", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    // The whole reason the figure comes off the envelope: the rows on this
    // page sum to ₱2,250, and the period's real total is far larger.
    expect(reportTotal()).toHaveTextContent("₱48,250.00");
    expect(reportTotal()).not.toHaveTextContent("₱2,250.00");
  });

  it("keeps showing the server's figure when it is smaller than the page", async () => {
    // Direction-blind: a client-side sum would beat the server's number here
    // rather than trail it, and the previous test alone would not notice.
    mockGetReport.mockResolvedValue(page(rows, 100));
    renderPage();
    await screen.findByText("Anna Reyes");

    expect(reportTotal()).toHaveTextContent("₱100.00");
  });

  it("says the total is unavailable rather than zero when the report fails", async () => {
    // Story 14 of #64: a failure must never be readable as a zero total.
    mockGetReport.mockRejectedValue(new Error("Network down"));
    renderPage();

    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    expect(reportTotal()).not.toHaveTextContent("₱0.00");
  });

  it("shows a real zero total for a period that collected nothing", async () => {
    mockGetReport.mockResolvedValue(page([], 0));
    renderPage();

    expect(await screen.findByText("No entries found")).toBeInTheDocument();
    expect(reportTotal()).toHaveTextContent("₱0.00");
  });
});

describe("TransactionReportPage — the filters", () => {
  it("sends both ends of a picked date range to the endpoint", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    fireEvent.click(screen.getByRole("button", { name: "Pick range" }));

    // One patch, not two writes: the range moves both ends at once, and two
    // would mean two refetches for one action.
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { from_date: "2026-08-01", to_date: "2026-08-31" },
      }),
    );
  });

  it("restores a date range and a cashier from the URL", async () => {
    renderPage(
      "/reports/transactions?transactions_report_from_date=2026-08-01&transactions_report_to_date=2026-08-31&transactions_report_cashier_id=8",
    );
    await screen.findByText("Anna Reyes");

    // `Y-m-d` and nothing else; an ISO timestamp is a 422 here.
    expect(lastRequest()).toMatchObject({
      filters: {
        from_date: "2026-08-01",
        to_date: "2026-08-31",
        cashier_id: "8",
      },
    });
  });

  it("completes a half-written URL range from the declared month", async () => {
    // `to_date` carries `after_or_equal:from_date`, so half a range would
    // be a 422. A missing end reads as its default rather than as nothing,
    // which is what keeps that state off the wire now the default is a
    // real month rather than null.
    renderPage(
      "/reports/transactions?transactions_report_from_date=2026-08-01",
    );
    await screen.findByText("Anna Reyes");

    expect(lastRequest()).toMatchObject({
      filters: { from_date: "2026-08-01", to_date: "2026-09-30" },
    });
  });

  it("offers only real cashiers, and sends the one chosen", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");
    await waitFor(() => expect(mockGetCashiers).toHaveBeenCalled());

    // The endpoint validates `cashier_id` against the cashier role, so an
    // identifier that isn't one is a 422. `/cashiers` only ever returns them.
    chooseFromSelect("Cashier", "Noli Cruz");

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { cashier_id: "8" } }),
    );
  });
});

describe("TransactionReportPage — clearing", () => {
  it("clears the range to all dates, and still loads rows", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    fireEvent.click(screen.getByRole("button", { name: "Clear range" }));

    // Its range is optional, unlike the two Services Sold pages, so all
    // dates is a real state here rather than a 422 waiting to happen —
    // and reaching it takes a filter that can say "none" separately from
    // "at its default", which is the current month on this page.
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { from_date: null, to_date: null },
      }),
    );
    expect(await screen.findByText("Anna Reyes")).toBeInTheDocument();
    expect(screen.getByText("Showing all dates")).toBeInTheDocument();
  });

  it("keeps all dates across a reload, rather than reverting to the month", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");
    fireEvent.click(screen.getByRole("button", { name: "Clear range" }));
    await waitFor(() =>
      expect(lastRequest().filters).toMatchObject({ from_date: null }),
    );

    // The URL is what a refresh and a pasted link restore from, so an
    // emptied range has to survive as something other than an absent one.
    expect(currentUrl()).toContain("transactions_report_from_date=none");
  });

  it("returns the range to the current month from the toolbar clear", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");
    fireEvent.click(screen.getByRole("button", { name: "Pick range" }));
    await waitFor(() =>
      expect(lastRequest().filters).toMatchObject({ from_date: "2026-08-01" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    // Clear filters means "back to how this table opens", which is not the
    // same as the range control's own clear.
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { from_date: "2026-09-01", to_date: "2026-09-30" },
      }),
    );
  });
});

describe("TransactionReportPage — the period line", () => {
  it("names the month it opened on", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    // The report carries a grand total beneath the table, so the period
    // that total covers has to be on screen with it.
    expect(screen.getByText("Showing September 2026")).toBeInTheDocument();
  });

  it("follows a picked range rather than naming the default", async () => {
    renderPage();
    await screen.findByText("Anna Reyes");

    fireEvent.click(screen.getByRole("button", { name: "Pick range" }));

    expect(await screen.findByText("Showing August 2026")).toBeInTheDocument();
    expect(
      screen.queryByText("Showing September 2026"),
    ).not.toBeInTheDocument();
  });
});
