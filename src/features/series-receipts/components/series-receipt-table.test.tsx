// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { within } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { getSeriesReceipts } from "../api/get-series-receipts";
import type { SeriesReceipt } from "../types";
import { SeriesReceiptTable } from "./series-receipt-table";

// Seam: the table component, the fetcher mocked at its module boundary.

vi.mock("../api/get-series-receipts", async () => {
  // A factory, not a bare `vi.mock`: automock empties exported arrays, so
  // this module's sort plan would silently become a table with no sort.
  const actual = await vi.importActual<
    typeof import("../api/get-series-receipts")
  >("../api/get-series-receipts");
  return { ...actual, getSeriesReceipts: vi.fn() };
});
const mockGetSeriesReceipts = vi.mocked(getSeriesReceipts);

// jsdom implements no ResizeObserver; Mantine's ScrollArea subscribes to
// one on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const cashier = (id: number, full_name: string) => ({ id, full_name });

const rows: SeriesReceipt[] = [
  {
    id: 1,
    cashier: cashier(7, "Jaypee Pahayahay"),
    from: 1,
    to: 50,
    remaining_sheets: 50,
    status: "active",
    createdBy: cashier(99, "Mike Bautista"),
  },
  {
    id: 2,
    cashier: cashier(7, "Jaypee Pahayahay"),
    from: 51,
    to: 100,
    remaining_sheets: 50,
    status: "queued",
    createdBy: cashier(99, "Mike Bautista"),
  },
  {
    id: 3,
    cashier: cashier(8, "Noli Cruz"),
    from: 101,
    to: 150,
    remaining_sheets: 0,
    status: "exhausted",
    createdBy: cashier(99, "Mike Bautista"),
  },
  {
    id: 4,
    cashier: cashier(9, "Ana Reyes"),
    from: 151,
    to: 200,
    remaining_sheets: 50,
    status: "suspended",
    createdBy: cashier(99, "Mike Bautista"),
  },
];

/** One page of series receipts, in the shape `useServerTableState` expects. */
const page = (data: SeriesReceipt[]) => ({ data, total: data.length });

const tableRows = () => within(screen.getByRole("table"));

function renderTable() {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={["/accounts/series-receipts"]}>
      <SeriesReceiptTable />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSeriesReceipts.mockResolvedValue(page(rows));
});

describe("SeriesReceiptTable — the Status column", () => {
  it("shows each booklet's assigned status", async () => {
    renderTable();

    expect(await tableRows().findByText("Active")).toBeInTheDocument();
    expect(tableRows().getByText("Queued")).toBeInTheDocument();
    expect(tableRows().getByText("Exhausted")).toBeInTheDocument();
    expect(tableRows().getByText("Suspended")).toBeInTheDocument();
  });

  it("offers no sort on Status, since the endpoint has no status sort or filter", async () => {
    renderTable();
    await tableRows().findByText("Active");

    expect(
      screen.getByRole("columnheader", { name: "Status" }),
    ).not.toHaveAttribute("aria-sort");
  });
});
