// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import { notifications } from "@mantine/notifications";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { useAuthStore } from "@/stores/auth-store";
import { getCashiers } from "@/api/cashiers";
import type { AuthUser } from "@/features/auth/types";
import { getTransactions } from "../api/get-transactions";
import type { TransactionListRow } from "../types";
import { TransactionListPage } from "./transaction-list-page";

// Seam: the page component, with the list fetcher and the cashier lookup
// mocked at the module boundary. What a user can see and do — which rows
// render, what a filter change put on the wire, where a row click landed.
// Nothing here asserts on table plumbing; DataTable and
// useServerTableState have their own tests.
//
// **Filters are asserted through the params the fetcher was called with,
// because that is what a server filter does.** The rows come back already
// narrowed, so a test that stubbed narrowed rows would pass whatever the
// page actually sent — including a filter key `/transactions` answers with
// a 400.

vi.mock("../api/get-transactions");
const mockGetTransactions = vi.mocked(getTransactions);

vi.mock("@/api/cashiers", async () => {
  // The query key builder is not a collaborator — mocking it would let the
  // two cashier-list variants share a key without anything noticing.
  const actual = await vi.importActual<typeof import("@/api/cashiers")>(
    "@/api/cashiers",
  );
  return { ...actual, getCashiers: vi.fn() };
});
const mockGetCashiers = vi.mocked(getCashiers);

// Mantine's Select renders its dropdown inside a ScrollArea, and so does
// `DataTable.Grid`; both subscribe to a ResizeObserver on mount, which
// jsdom doesn't implement. Same stub as manage-accounts-page.test.tsx.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

// Mantine's Combobox scrolls its active option into view on open, and
// jsdom implements no scrolling. Without this a Select throws outside the
// assertion, as an unhandled rejection — every test stays green while the
// run exits non-zero.
Element.prototype.scrollIntoView = vi.fn();

const rows: TransactionListRow[] = [
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
    items: [
      { id: 11, name: "SHS GRADUATION FEE" },
      { id: 12, name: "AUGUST RENT" },
      { id: 13, name: "ID REPLACEMENT" },
    ],
  },
  {
    // Never saved: no series number, no payer, no total, no items. This
    // page lists every status, so the empty cells are a real row shape and
    // not a contrived one.
    control_id: 1202,
    cashier: { id: 8, full_name: "Noli Cruz" },
    series_number: null,
    customer_name: null,
    total: null,
    amount_paid: 0,
    change_amount: 0,
    status: "pending",
    date: "2026-08-25T01:15:00.000000Z",
    items: [],
  },
];

const admin: AuthUser = {
  id: 99,
  first_name: "Mike",
  last_name: "Bautista",
  full_name: "Mike Bautista",
  user_name: "mike",
  role: "admin",
};

const cashier: AuthUser = { ...admin, id: 7, role: "cashier" };

/** One page of transactions, in the shape `useServerTableState` expects. */
const page = (data: TransactionListRow[]) => ({ data, total: data.length });

/** The params of the most recent request, which is where a filter, a sort
 * or a page change is observable. */
const lastRequest = () =>
  mockGetTransactions.mock.calls[mockGetTransactions.mock.calls.length - 1][0];

/** `MemoryRouter` keeps its history off `window.location`, so a navigation
 * has to be read through the router rather than through the address bar. */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderPage(initialEntry = "/transactions/receipts") {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TransactionListPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

/** The rows themselves, so an assertion about the list can't be satisfied
 * by the same text appearing in a filter control above it. */
const tableRows = () => within(screen.getByRole("table"));

/** Picks an option out of one Mantine `Select`.
 *
 * By role and accessible name, not by label text: a `Select` renders a
 * hidden input carrying the same value alongside the visible combobox, and
 * both answer to the label. The options are then scoped to that combobox's
 * own dropdown through `aria-controls` — this page renders three selects
 * (status, cashier, and the toolbar's page size), so a global option query
 * would reach into whichever one it found first.
 */
function chooseFromSelect(label: string, optionText: string) {
  const combobox = screen.getByRole("combobox", { name: label });
  fireEvent.click(combobox);

  const dropdown = document.getElementById(
    combobox.getAttribute("aria-controls")!,
  )!;
  fireEvent.click(within(dropdown).getByText(optionText));
}

/** Past the text filters' debounce and then some. A fixed flush rather
 * than `waitFor`, because the negative assertions below are about a call
 * that must never happen — and `waitFor` returns on its first successful
 * check, so it would pass against a page with no debounce and no guard. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 600));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTransactions.mockResolvedValue(page(rows));
  mockGetCashiers.mockResolvedValue([
    { id: 7, full_name: "Jaypee Pahayahay" },
    { id: 8, full_name: "Noli Cruz" },
  ]);
  useAuthStore.setState({ user: admin, status: "authenticated" });
});

afterEach(() => {
  // Mantine's notification store is module-level and outlives RTL's
  // unmount, so a toast raised in one test is still queued in the next.
  notifications.clean();
});

describe("TransactionListPage", () => {
  it("renders a row per transaction with what identifies it", async () => {
    renderPage();

    expect(await screen.findByText("Juan Dela Cruz")).toBeInTheDocument();
    expect(tableRows().getByText("1201")).toBeInTheDocument();
    expect(tableRows().getByText("4501")).toBeInTheDocument();
    expect(tableRows().getByText("₱1,500.00")).toBeInTheDocument();
  });

  it("shows each transaction's status, so a voided one is visible before opening it", async () => {
    mockGetTransactions.mockResolvedValue(
      page([{ ...rows[0], status: "returned" }]),
    );
    renderPage();

    await screen.findByText("Juan Dela Cruz");
    // "Voided", not "Returned" — the wire's word for the result of the
    // Void action is not the word anyone here uses for it.
    expect(tableRows().getByText("Voided")).toBeInTheDocument();
  });

  it("names the items on a row, so a search by item shows why it matched", async () => {
    renderPage();

    await screen.findByText("Juan Dela Cruz");
    expect(
      tableRows().getByText(/SHS GRADUATION FEE, AUGUST RENT/),
    ).toBeInTheDocument();
    // Three items, two named: the third is counted rather than listed.
    expect(tableRows().getByText("+1 more")).toBeInTheDocument();
  });

  it("offers no search box, because /transactions has no search filter", async () => {
    renderPage();
    await screen.findByText("Juan Dela Cruz");

    // An unknown `filter[]` key is a 400 here, not an ignored parameter, so
    // a search box would fail the first time anyone typed into it.
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });

  it("asks for every transaction, newest first, on a fresh visit", async () => {
    renderPage();
    await screen.findByText("Juan Dela Cruz");

    // `created_at`, the endpoint's own name for the Date column's sort —
    // this one reaches the wire before the user touches anything, so the
    // field name would be a 422 on arrival.
    expect(lastRequest()).toMatchObject({
      page: 1,
      sorts: [{ key: "created_at", direction: "desc" }],
      filters: {
        customer: null,
        series_number: null,
        status: null,
        item_name: null,
        from_date: null,
        to_date: null,
        cashier_id: null,
      },
    });
  });

  it("narrows to one payer at the endpoint", async () => {
    renderPage();
    await screen.findByText("Juan Dela Cruz");

    // `customer`, not `customer_name`: the response field and the filter
    // key disagree, and this is the filter.
    fireEvent.change(screen.getByLabelText("Payer Name"), {
      target: { value: "santos" },
    });

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { customer: "santos" } }),
    );
  });

  it("narrows to one series number at the endpoint", async () => {
    renderPage();
    await screen.findByText("Juan Dela Cruz");

    fireEvent.change(screen.getByLabelText("Series No."), {
      target: { value: "4501" },
    });

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { series_number: "4501" },
      }),
    );
  });

  it("narrows to one item name at the endpoint", async () => {
    renderPage();
    await screen.findByText("Juan Dela Cruz");

    fireEvent.change(screen.getByLabelText("Item Name"), {
      target: { value: "graduation" },
    });

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { item_name: "graduation" },
      }),
    );
  });

  it("keeps the other filters when only one of them changes", async () => {
    renderPage();
    await screen.findByText("Juan Dela Cruz");

    fireEvent.change(screen.getByLabelText("Payer Name"), {
      target: { value: "santos" },
    });
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { customer: "santos" } }),
    );

    fireEvent.change(screen.getByLabelText("Item Name"), {
      target: { value: "rent" },
    });

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { customer: "santos", item_name: "rent" },
      }),
    );
  });

  it("asks the endpoint once for a word, not once per keystroke", async () => {
    renderPage();
    await screen.findByText("Juan Dela Cruz");
    const before = mockGetTransactions.mock.calls.length;

    for (const prefix of ["s", "sa", "san", "sant", "santo", "santos"]) {
      fireEvent.change(screen.getByLabelText("Payer Name"), {
        target: { value: prefix },
      });
    }
    // Wait for the debounced request rather than assuming 600ms of real
    // time is enough for it: this is the one place `flush` was carrying a
    // positive assertion, and a loaded machine can push a 400ms debounce
    // plus its render past a fixed wait. #62 added the 39th jsdom file to
    // the suite, which is what made that margin too thin to rely on.
    //
    // The negative half keeps the fixed flush, and is the reason the two
    // are split: `waitFor` alone would return on the first call and prove
    // nothing about the five that must not follow.
    await waitFor(() =>
      expect(mockGetTransactions.mock.calls.length).toBe(before + 1),
    );
    await flush();

    expect(mockGetTransactions.mock.calls.length).toBe(before + 1);
  });

  it("narrows to one status at the endpoint", async () => {
    renderPage();
    await screen.findByText("Juan Dela Cruz");

    chooseFromSelect("Status", "Voided");

    // `returned` on the wire, "Voided" on screen.
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { status: "returned" } }),
    );
  });

  it("restores a date range from the URL and sends both ends", async () => {
    renderPage(
      "/transactions/receipts?receipts_from_date=2026-08-01&receipts_to_date=2026-08-31",
    );
    await screen.findByText("Juan Dela Cruz");

    // `Y-m-d` and nothing else. An ISO timestamp read out of a response is
    // a 422 here, which is why the range never carries one.
    expect(lastRequest()).toMatchObject({
      filters: { from_date: "2026-08-01", to_date: "2026-08-31" },
    });
  });

  it("asks for nothing while a restored date range has only one end", async () => {
    // `to_date` carries `after_or_equal:from_date`, so half a range is a
    // 422 rather than a looser filter. The control can't emit one, but a
    // hand-edited or truncated URL can.
    renderPage("/transactions/receipts?receipts_from_date=2026-08-01");
    await flush();

    expect(mockGetTransactions).not.toHaveBeenCalled();
    expect(screen.getByText("No entries found")).toBeInTheDocument();
  });

  it("sorts the payer column by the name the endpoint allow-lists", async () => {
    renderPage();
    await screen.findByText("Juan Dela Cruz");

    fireEvent.click(screen.getByText("Payer"));

    // `customer`. `customer_name` is the field it is returned in and is
    // not a sort the endpoint knows — it would be a 422.
    //
    // `toContainEqual`, because the declared `-created_at` is still the
    // primary sort: a table sorts on up to two columns, and this is the
    // second rather than a replacement for the first.
    await waitFor(() =>
      expect(lastRequest().sorts).toContainEqual({
        key: "customer",
        direction: "asc",
      }),
    );
  });

  it("opens the transaction whose row was clicked", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Juan Dela Cruz"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/transactions/1201",
    );
  });

  it("puts a real link on the control ID, not only a clickable row", async () => {
    // The row click is a mouse affordance; this is what a keyboard reaches
    // and what open-in-new-tab uses.
    renderPage();
    await screen.findByText("Juan Dela Cruz");

    expect(tableRows().getByRole("link", { name: "1201" })).toHaveAttribute(
      "href",
      "/transactions/1201",
    );
  });

  it("says so when nothing matches", async () => {
    mockGetTransactions.mockResolvedValue(page([]));
    renderPage();

    expect(await screen.findByText("No entries found")).toBeInTheDocument();
  });

  it("doesn't claim nothing matches while the list is still loading", async () => {
    mockGetTransactions.mockReturnValue(new Promise(() => {})); // never settles
    renderPage();

    expect(screen.queryByText("No entries found")).not.toBeInTheDocument();
  });

  it("surfaces a failure to load in place of the rows", async () => {
    mockGetTransactions.mockRejectedValue(new Error("Network down"));
    renderPage();

    expect(
      await screen.findByText("Couldn't load data. Please try again."),
    ).toBeInTheDocument();
  });
});

describe("TransactionListPage — what each role gets", () => {
  it("lets an admin filter by cashier", async () => {
    renderPage();
    await screen.findByText("Juan Dela Cruz");

    // The list has to have arrived before the dropdown can offer it.
    await waitFor(() => expect(mockGetCashiers).toHaveBeenCalled());
    chooseFromSelect("Cashier", "Noli Cruz");

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { cashier_id: "8" } }),
    );
  });

  it("shows an admin which cashier took each transaction", async () => {
    renderPage();

    await screen.findByText("Juan Dela Cruz");
    expect(tableRows().getByText("Jaypee Pahayahay")).toBeInTheDocument();
  });

  it("never offers a cashier the admin-only cashier filter", async () => {
    useAuthStore.setState({ user: cashier, status: "authenticated" });
    renderPage();
    await screen.findByText("Juan Dela Cruz");
    await flush();

    // Two independent refusals, not one: `filter[cashier_id]` is not in a
    // cashier's allow-list on `/transactions`, and `GET /cashiers` — the
    // query the control holds — is admin-only too. Not rendering the
    // control is what makes the second one never fire.
    expect(
      screen.queryByRole("combobox", { name: "Cashier" }),
    ).not.toBeInTheDocument();
    expect(mockGetCashiers).not.toHaveBeenCalled();
  });

  it("never sends cashier_id for a cashier, even from a hand-edited URL", async () => {
    // The filter is role-gated by being declared or not, rather than by
    // its control being rendered or not. Only declared keys are read from
    // the URL, so this one is dropped rather than forwarded into a 400.
    useAuthStore.setState({ user: cashier, status: "authenticated" });
    renderPage("/transactions/receipts?receipts_cashier_id=8");
    await screen.findByText("Juan Dela Cruz");

    expect(lastRequest().filters).not.toHaveProperty("cashier_id");
  });

  it("doesn't show a cashier a column of their own name", async () => {
    // The endpoint scopes them to their own rows, so the column carries
    // nothing, and the filter beside it isn't theirs to use.
    useAuthStore.setState({ user: cashier, status: "authenticated" });
    renderPage();
    await screen.findByText("Juan Dela Cruz");

    expect(
      screen.queryByRole("columnheader", { name: "Cashier" }),
    ).not.toBeInTheDocument();
  });
});
