// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AxiosError } from "axios";
import { MemoryRouter, useLocation } from "react-router";
import { Notifications, notifications } from "@mantine/notifications";
import { fireEvent, waitFor, within } from "@testing-library/react";
import type { QueryClient } from "@tanstack/react-query";
import { screen, renderWithQueryClient } from "@/test/render";
import { getCashiers } from "@/api/cashiers";
import { getTransactions } from "../api/get-transactions";
import { voidTransaction } from "../api/void-transaction";
import { transactionDetailQueryKey } from "../api/transaction-query-keys";
import type { TransactionListRow } from "../types";
import { VoidTransactionPage } from "./void-transaction-page";

// Seam: the page component, with the list fetcher and the void action
// mocked at the module boundary. What an admin can see and do — which rows
// render, what the confirmation says before anything is reversed, what the
// void put on the wire, and what the app looks like afterwards.
//
// **`get-transactions` is mocked, not `get-voidable-transactions`.** The
// second is where the status pin lives, and mocking it would mock away the
// only thing this page's list does differently from the receipts list. One
// level down, `filters.status` is a fact about the request rather than
// about a stub, which is the same reason #61 asserts its filters through
// the params the fetcher received.

vi.mock("../api/get-transactions", async () => {
  // A factory, not a bare `vi.mock`. Automocking replaces every export of
  // the module, and it empties exported arrays — which is how the receipts
  // page's default sort silently became `[]` earlier on this branch. The
  // query keys have since moved to their own unmocked module, so nothing
  // in this file depends on that any more, but a bare mock here would put
  // the hazard back the moment a constant returns to this module.
  const actual = await vi.importActual<
    typeof import("../api/get-transactions")
  >("../api/get-transactions");
  return { ...actual, getTransactions: vi.fn() };
});
const mockGetTransactions = vi.mocked(getTransactions);

vi.mock("../api/void-transaction");
const mockVoidTransaction = vi.mocked(voidTransaction);

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
// jsdom doesn't implement. Same stub as transaction-list-page.test.tsx.
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

// Every row this page can show is `completed`: that is the whole list, and
// the only status `POST /void` accepts. A pending or already-voided row
// here would be a row whose only action is guaranteed to 409.
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
    items: [{ id: 11, name: "SHS GRADUATION FEE" }],
  },
  {
    // The adjacent row the confirmation exists to be distinguished from:
    // same cashier, same day, a series number one away.
    control_id: 1202,
    cashier: { id: 7, full_name: "Jaypee Pahayahay" },
    series_number: 4502,
    customer_name: "Maria Santos",
    total: 750,
    amount_paid: 1000,
    change_amount: 250,
    status: "completed",
    date: "2026-08-24T07:10:00.000000Z",
    items: [{ id: 21, name: "ID REPLACEMENT" }],
  },
];

/** One page of transactions, in the shape `useServerTableState` expects. */
const page = (data: TransactionListRow[]) => ({ data, total: data.length });

/** The params of the most recent request, which is where the pinned status
 * is observable. */
const lastRequest = () =>
  mockGetTransactions.mock.calls[mockGetTransactions.mock.calls.length - 1][0];

/** `MemoryRouter` keeps its history off `window.location`, so staying on
 * the page has to be read through the router rather than the address bar. */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderPage(initialEntry = "/void") {
  return renderWithQueryClient(
    <>
      {/* Mounted the way the app mounts it, so a success or a refusal that
          surfaces only as a toast is still visible to these tests. */}
      <Notifications />
      <MemoryRouter initialEntries={[initialEntry]}>
        <VoidTransactionPage />
        <LocationProbe />
      </MemoryRouter>
    </>,
  );
}

/** The rows themselves, so an assertion about the list can't be satisfied
 * by the same text appearing in a filter control or a dialog. */
const tableRows = () => within(screen.getByRole("table"));

/** The open confirmation, scoped — every identifier it carries also
 * appears in the row behind it, which is the point of showing them. */
const dialog = () => within(screen.getByRole("dialog"));

/** Opens the confirmation for one row. The buttons are named per row
 * rather than all reading "Void", because a column of identically named
 * buttons is ambiguous to anything that can't see which row it is in. */
async function openConfirmFor(controlId: number) {
  fireEvent.click(
    await screen.findByRole("button", {
      name: `Void transaction ${controlId}`,
    }),
  );
  return screen.findByRole("dialog");
}

/** A 409 from `ensureActionAllowed`, in the envelope the API sends it in.
 * The wording is the server's own: it names the status it found, which is
 * how an admin learns someone else voided this row first. */
const conflict = (message: string) =>
  new AxiosError(message, "409", undefined, undefined, {
    status: 409,
    data: { success: false, message, data: [], code: 409 },
  } as never);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTransactions.mockResolvedValue(page(rows));
  mockGetCashiers.mockResolvedValue([
    { id: 7, full_name: "Jaypee Pahayahay" },
  ] as never);
  mockVoidTransaction.mockResolvedValue({} as never);
});

afterEach(() => {
  notifications.clean();
});

describe("VoidTransactionPage", () => {
  it("asks the endpoint for completed transactions and nothing else", async () => {
    renderPage();

    await screen.findByText("Juan Dela Cruz");
    expect(lastRequest().filters).toMatchObject({ status: "completed" });
  });

  it("keeps the status pinned against a hand-edited URL", async () => {
    // The page declares no `status` filter, so `void_status` is not a key
    // `useTableControls` reads — and the pin is applied after it either
    // way. A declared filter defaulting to `completed` would fail here.
    renderPage("/void?void_status=pending");

    await screen.findByText("Juan Dela Cruz");
    expect(lastRequest().filters).toMatchObject({ status: "completed" });
  });

  it("offers no status filter, because the status is not the admin's to choose", async () => {
    renderPage();

    await screen.findByText("Juan Dela Cruz");
    expect(
      screen.queryByRole("combobox", { name: "Status" }),
    ).not.toBeInTheDocument();
  });

  it("offers the cashier filter unconditionally, the page being admin-only", async () => {
    renderPage();

    expect(
      await screen.findByRole("combobox", { name: "Cashier" }),
    ).toBeInTheDocument();
  });

  it("shows no Status column, every row having the same one", async () => {
    renderPage();

    await screen.findByText("Juan Dela Cruz");
    expect(
      tableRows().queryByRole("columnheader", { name: "Status" }),
    ).not.toBeInTheDocument();
  });

  it("asks for confirmation before voiding anything", async () => {
    renderPage();
    await openConfirmFor(1201);

    expect(mockVoidTransaction).not.toHaveBeenCalled();
  });

  it("names the transaction being voided, enough to tell it from its neighbour", async () => {
    renderPage();
    await openConfirmFor(1201);

    expect(dialog().getByText("1201")).toBeInTheDocument();
    expect(dialog().getByText("4501")).toBeInTheDocument();
    expect(dialog().getByText("Juan Dela Cruz")).toBeInTheDocument();
    expect(dialog().getByText("₱1,500.00")).toBeInTheDocument();
  });

  it("carries the identifiers of the row whose button was clicked", async () => {
    renderPage();
    await openConfirmFor(1202);

    expect(dialog().getByText("4502")).toBeInTheDocument();
    expect(dialog().getByText("Maria Santos")).toBeInTheDocument();
    expect(dialog().queryByText("Juan Dela Cruz")).not.toBeInTheDocument();
  });

  it("voids nothing when the confirmation is cancelled", async () => {
    renderPage();
    await openConfirmFor(1201);

    fireEvent.click(dialog().getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(mockVoidTransaction).not.toHaveBeenCalled();
  });

  it("voids the confirmed transaction, once", async () => {
    renderPage();
    await openConfirmFor(1201);

    fireEvent.click(dialog().getByRole("button", { name: "Void Transaction" }));

    await waitFor(() =>
      expect(mockVoidTransaction).toHaveBeenCalledExactlyOnceWith(1201),
    );
  });

  it("refreshes the list, and leaves nothing stale to show for that transaction", async () => {
    // The detail half is the load-bearing one, and marking it stale is not
    // enough. Voiding happens on this page, so that query is inactive and
    // an invalidation only flags it; React Query then hands the next
    // mount the cached entry synchronously and revalidates behind it.
    // Found in a browser: the View page painted "Completed" on a
    // transaction that had just been voided.
    //
    // So the assertion is that the entry is *gone*, not that it is
    // flagged. `isInvalidated` was true the whole time the page was
    // rendering the wrong status, which is what made the old version of
    // this test agree with a real defect.
    const { queryClient } = renderPage();
    const detailKey = transactionDetailQueryKey(1201);
    seedDetail(queryClient, detailKey);

    await openConfirmFor(1201);
    const requestsBefore = mockGetTransactions.mock.calls.length;
    fireEvent.click(dialog().getByRole("button", { name: "Void Transaction" }));

    await waitFor(() =>
      expect(mockGetTransactions.mock.calls.length).toBeGreaterThan(
        requestsBefore,
      ),
    );
    expect(queryClient.getQueryData(detailKey)).toBeUndefined();
  });

  it("says the void succeeded, and stays on the list", async () => {
    renderPage();
    await openConfirmFor(1201);

    fireEvent.click(dialog().getByRole("button", { name: "Void Transaction" }));

    expect(
      await screen.findByText("Transaction 1201 was voided."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/void");
  });

  it("closes the confirmation once the void has gone through", async () => {
    renderPage();
    await openConfirmFor(1201);

    fireEvent.click(dialog().getByRole("button", { name: "Void Transaction" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("surfaces the server's refusal rather than a generic failure", async () => {
    const message =
      "Invalid Action. Cannot void a transaction with status 'returned'.";
    mockVoidTransaction.mockRejectedValue(conflict(message));

    renderPage();
    await openConfirmFor(1201);
    fireEvent.click(dialog().getByRole("button", { name: "Void Transaction" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("refreshes the list after a refusal, the refusal being evidence it is stale", async () => {
    // Every row on this page is meant to be voidable. A 409 says one of
    // them isn't, which means the list is out of date — leaving it up
    // would leave a Void button that can only fail the same way again.
    mockVoidTransaction.mockRejectedValue(
      conflict("Invalid Action. Cannot void a transaction with status 'returned'."),
    );

    renderPage();
    await openConfirmFor(1201);
    const requestsBefore = mockGetTransactions.mock.calls.length;
    fireEvent.click(dialog().getByRole("button", { name: "Void Transaction" }));

    await waitFor(() =>
      expect(mockGetTransactions.mock.calls.length).toBeGreaterThan(
        requestsBefore,
      ),
    );
  });

  it("says something useful when the failure carries no message", async () => {
    mockVoidTransaction.mockRejectedValue(new Error("Network Error"));

    renderPage();
    await openConfirmFor(1201);
    fireEvent.click(dialog().getByRole("button", { name: "Void Transaction" }));

    expect(
      await screen.findByText("Couldn't void this transaction."),
    ).toBeInTheDocument();
  });
});

/** A detail entry already in cache, the way it would be for an admin who
 * opened the transaction from the receipts list before voiding it. The
 * status is the field that matters: this is the value the View page would
 * paint if anything survived the void. */
function seedDetail(
  queryClient: QueryClient,
  key: ReturnType<typeof transactionDetailQueryKey>,
) {
  queryClient.setQueryData(key, { control_id: key[1], status: "completed" });
}
