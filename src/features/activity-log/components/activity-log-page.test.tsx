// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { notifications } from "@mantine/notifications";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { getActivityLogs } from "../api/get-activity-logs";
import { getActivityLogDetail } from "../api/get-activity-log-detail";
import type { ActivityLogDetail, ActivityLogListRow } from "../types";
import { ActivityLogPage } from "./activity-log-page";

// Seam: the page component, both fetchers mocked at the module boundary.

vi.mock("../api/get-activity-logs");
const mockGetActivityLogs = vi.mocked(getActivityLogs);

vi.mock("../api/get-activity-log-detail");
const mockGetDetail = vi.mocked(getActivityLogDetail);

// Mantine's picker popover never opens under jsdom, so the shared control
// is stood in for by a button emitting one fixed range. A factory, not a
// bare `vi.mock`: automock would empty `toApiDate` too, and the
// URL-restore tests below read dates through it.
vi.mock("@/components/ui/date-range", async () => {
  const actual =
    await vi.importActual<typeof import("@/components/ui/date-range")>(
      "@/components/ui/date-range",
    );
  return {
    ...actual,
    DateRangeFilter: ({
      onChange,
    }: {
      onChange: (value: { from: string; to: string }) => void;
    }) => (
      <button
        onClick={() => onChange({ from: "2026-08-01", to: "2026-08-31" })}
      >
        Pick range
      </button>
    ),
  };
});

// jsdom implements no ResizeObserver; Mantine's ScrollArea subscribes to
// one on mount, and the Drawer contains one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

Element.prototype.scrollIntoView = vi.fn();

const rows: ActivityLogListRow[] = [
  {
    id: 501,
    // Already a display string on the wire, not a code the page maps.
    type: "Transaction - Void",
    context: "Returned/Voided Transaction #1201 - Series Receipt #4501",
    created_at: "2026-08-24T06:30:00.000000Z",
    actor: { id: 99, name: "Mike Bautista", role: "admin" },
  },
  {
    // System-generated: a null id and the name the backend supplies.
    id: 502,
    type: "Transaction - Abandoned",
    context: "Abandoned Transaction #1180",
    created_at: "2026-08-25T01:15:00.000000Z",
    actor: { id: null, name: "System", role: null },
  },
];

/** A voided transaction's detail: a subject that still exists and has a
 * route, and values already formatted server-side. */
const voidDetail: ActivityLogDetail = {
  ...rows[0],
  subject: { type: "transaction", id: 1201, exists: true },
  details: [
    { label: "Status", value: "completed → returned" },
    { label: "Total", value: "₱1,500.00" },
  ],
};

const page = (data: ActivityLogListRow[]) => ({ data, total: data.length });

const lastRequest = () =>
  mockGetActivityLogs.mock.calls[mockGetActivityLogs.mock.calls.length - 1][0];

function renderPage(initialEntry = "/activity-log") {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ActivityLogPage />
    </MemoryRouter>,
  );
}

/** The rows themselves, so an assertion about the list can't be satisfied
 * by the same text appearing in the drawer or a filter above it. */
const tableRows = () => within(screen.getByRole("table"));

const drawer = () => within(screen.getByRole("dialog"));

/** Opens the drawer on the voided-transaction row. */
async function openFirstEntry() {
  fireEvent.click(await screen.findByText(rows[0].context));
  return screen.findByRole("dialog");
}

/** Past the debounce in `useTableControls` and then some. Fixed rather
 * than `waitFor`, because the assertions it guards are about a request
 * that must never happen. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 600));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetActivityLogs.mockResolvedValue(page(rows));
  mockGetDetail.mockResolvedValue(voidDetail);
});

afterEach(() => {
  notifications.clean();
});

describe("ActivityLogPage — the list", () => {
  it("renders a row per entry, saying what happened, who did it and when", async () => {
    renderPage();

    expect(await screen.findByText(rows[0].context)).toBeInTheDocument();
    expect(tableRows().getByText("Transaction - Void")).toBeInTheDocument();
    expect(tableRows().getByText("Mike Bautista")).toBeInTheDocument();

    // Scoped to this entry's own row, and shape-matched rather than
    // spelled out: every row carries a date, and the clock reading is the
    // runner's timezone. What matters is that the shared formatter ran
    // instead of the raw ISO string reaching the cell.
    const row = tableRows().getByText(rows[0].context).closest("tr")!;
    expect(
      within(row).getByText(/^\w{3} \d{1,2}, 2026, \d{1,2}:\d{2} [AP]M$/),
    ).toBeInTheDocument();
  });

  it("names the system as the actor on an entry no person performed", async () => {
    renderPage();
    await screen.findByText(rows[1].context);

    // The backend sends the name "System" with a null id, so there is no
    // null case here for the page to invent copy for.
    expect(tableRows().getByText("System")).toBeInTheDocument();
  });

  it("asks for the newest activity first on a fresh visit", async () => {
    renderPage();
    await screen.findByText(rows[0].context);

    // `created_at` is the endpoint's only allow-listed sort, and this
    // reaches the wire before the user touches anything.
    expect(lastRequest()).toMatchObject({
      page: 1,
      sorts: [{ key: "created_at", direction: "desc" }],
      filters: { from_date: null, to_date: null },
    });
  });

  it("offers no search box, because /activity-logs has no search filter", async () => {
    renderPage();
    await screen.findByText(rows[0].context);

    // An unknown `filter[]` key is a 400 here, not an ignored parameter.
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });

  it("restores a date range from the URL and sends both ends", async () => {
    renderPage(
      "/activity-log?activity_from_date=2026-08-01&activity_to_date=2026-08-31",
    );
    await screen.findByText(rows[0].context);

    // `Y-m-d` and nothing else; an ISO timestamp is a 422 here.
    expect(lastRequest()).toMatchObject({
      filters: { from_date: "2026-08-01", to_date: "2026-08-31" },
    });
  });

  it("sends both ends of a picked date range to the endpoint", async () => {
    renderPage();
    await screen.findByText(rows[0].context);

    fireEvent.click(screen.getByRole("button", { name: "Pick range" }));

    // One patch, not two writes: the range moves both ends at once, and
    // two would mean two refetches for one action.
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { from_date: "2026-08-01", to_date: "2026-08-31" },
      }),
    );
  });

  it("asks for nothing while a restored date range has only one end", async () => {
    // `to_date` carries `after_or_equal:from_date`, so half a range is a
    // 422 rather than a looser filter.
    renderPage("/activity-log?activity_from_date=2026-08-01");
    await flush();

    expect(mockGetActivityLogs).not.toHaveBeenCalled();
    expect(screen.getByText("No entries found")).toBeInTheDocument();
  });

  it("offers no sort on a column the endpoint does not allow-list", async () => {
    renderPage();
    await screen.findByText(rows[0].context);

    // `created_at` is the sole allow-listed sort; a click on any other
    // header would be a 422 on arrival.
    expect(screen.getByRole("columnheader", { name: /When/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(
      screen.getByRole("columnheader", { name: "Type" }),
    ).not.toHaveAttribute("aria-sort");
  });
});

describe("ActivityLogPage — the detail drawer", () => {
  it("opens on the row's own data before the details land", async () => {
    mockGetDetail.mockReturnValue(new Promise(() => {})); // never settles
    renderPage();
    await openFirstEntry();

    // All four came off the row, so a full-drawer spinner would hide
    // what is already known.
    expect(drawer().getByText("Transaction - Void")).toBeInTheDocument();
    expect(drawer().getByText(rows[0].context)).toBeInTheDocument();
    expect(drawer().getByText("Mike Bautista")).toBeInTheDocument();
    expect(screen.getByTestId("activity-details-skeleton")).toBeInTheDocument();
  });

  it("renders the details as label/value pairs once they resolve", async () => {
    renderPage();
    await openFirstEntry();

    expect(await screen.findByText("Status")).toBeInTheDocument();
    // Printed verbatim: the arrow and the peso sign are applied
    // server-side, and no client-side branching per event type exists.
    expect(drawer().getByText("completed → returned")).toBeInTheDocument();
    expect(drawer().getByText("₱1,500.00")).toBeInTheDocument();
  });

  it("asks for one entry's details once", async () => {
    renderPage();
    await openFirstEntry();
    await screen.findByText("Status");
    await flush();

    expect(mockGetDetail).toHaveBeenCalledTimes(1);
    expect(mockGetDetail).toHaveBeenCalledWith(501);
  });

  it("links a subject that still exists to the record it acted on", async () => {
    renderPage();
    await openFirstEntry();

    expect(
      await drawer().findByRole("link", { name: /Transaction #1201/ }),
    ).toHaveAttribute("href", "/transactions/1201");
  });

  it("says a deleted subject is gone rather than linking to it", async () => {
    mockGetDetail.mockResolvedValue({
      ...voidDetail,
      subject: { type: "transaction", id: 1201, exists: false },
    });
    renderPage();
    await openFirstEntry();

    expect(
      await drawer().findByText(/Transaction #1201 no longer exists/),
    ).toBeInTheDocument();
    expect(drawer().queryByRole("link")).not.toBeInTheDocument();
  });

  it("leaves a subject with no route unlinked", async () => {
    // Only transactions have a detail route today. A service, a series
    // receipt or an account is still named, so the reference is not hidden.
    mockGetDetail.mockResolvedValue({
      ...voidDetail,
      subject: { type: "service", id: 42, exists: true },
    });
    renderPage();
    await openFirstEntry();

    expect(await drawer().findByText(/Service #42/)).toBeInTheDocument();
    expect(drawer().queryByRole("link")).not.toBeInTheDocument();
  });

  it("calls an account subject an account, not a user", async () => {
    // ACCOUNT_CREATED logs against the User model, so `user` is what the
    // wire sends. "Account" is this app's word for it.
    mockGetDetail.mockResolvedValue({
      ...voidDetail,
      subject: { type: "user", id: 7, exists: true },
    });
    renderPage();
    await openFirstEntry();

    expect(await drawer().findByText(/Account #7/)).toBeInTheDocument();
    expect(drawer().queryByText(/User #7/)).not.toBeInTheDocument();
  });

  it("names a series receipt subject the way the glossary spells it", async () => {
    mockGetDetail.mockResolvedValue({
      ...voidDetail,
      subject: { type: "series_receipt", id: 4501, exists: true },
    });
    renderPage();
    await openFirstEntry();

    expect(await drawer().findByText(/Series receipt #4501/)).toBeInTheDocument();
  });

  it("closes back to the list", async () => {
    renderPage();
    await openFirstEntry();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(tableRows().getByText(rows[0].context)).toBeInTheDocument();
  });

  it("surfaces a failure to load the details without closing the drawer", async () => {
    mockGetDetail.mockRejectedValue(new Error("Network down"));
    renderPage();
    await openFirstEntry();

    expect(
      await drawer().findByText("Couldn't load this entry's details."),
    ).toBeInTheDocument();
    // What the row already knew is still worth showing.
    expect(drawer().getByText(rows[0].context)).toBeInTheDocument();
  });
});
