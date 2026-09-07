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
// mocked at the module boundary.
//
// `get-transactions` is mocked, not `get-voidable-transactions`: the
// second is where the status pin lives, so mocking it would mock away the
// only thing this list does differently.

vi.mock("../api/get-transactions", async () => {
  // A factory, not a bare `vi.mock`: automock empties exported arrays, so
  // any constant that returns to this module would silently become `[]`.
  const actual = await vi.importActual<
    typeof import("../api/get-transactions")
  >("../api/get-transactions");
  return { ...actual, getTransactions: vi.fn() };
});
const mockGetTransactions = vi.mocked(getTransactions);

vi.mock("../api/void-transaction");
const mockVoidTransaction = vi.mocked(voidTransaction);

vi.mock("@/api/cashiers", async () => {
  // The key builder is not a collaborator: mocking it would let the two
  // cashier-list variants share a key unnoticed.
  const actual = await vi.importActual<typeof import("@/api/cashiers")>(
    "@/api/cashiers",
  );
  return { ...actual, getCashiers: vi.fn() };
});
const mockGetCashiers = vi.mocked(getCashiers);

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

// Every row here is `completed`, the only status `POST /void` accepts.
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
    // The adjacent row the confirmation exists to distinguish: same
    // cashier, same day, a series number one away.
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

/** `MemoryRouter` keeps history off `window.location`. */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderPage(initialEntry = "/void") {
  return renderWithQueryClient(
    <>
      {/* Mounted as the app mounts it, so a toast is visible here. */}
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

/** Scoped: every identifier it carries also appears in the row behind. */
const dialog = () => within(screen.getByRole("dialog"));

/** Buttons are named per row, since a column of identical "Void" buttons
 * is ambiguous to anything that can't see which row it is in. */
async function openConfirmFor(controlId: number) {
  fireEvent.click(
    await screen.findByRole("button", {
      name: `Void transaction ${controlId}`,
    }),
  );
  return screen.findByRole("dialog");
}

/** A 409 in the envelope the API sends it in. The wording is the
 * server's own. */
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
    // The entry must be *gone*, not flagged. `isInvalidated` was true the
    // whole time the View page rendered a voided transaction as
    // "Completed", which is how the old version of this test agreed with
    // a real defect.
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

/** A cached detail entry, as an admin who opened the transaction before
 * voiding would have. The status is what the View page would paint if
 * anything survived. */
function seedDetail(
  queryClient: QueryClient,
  key: ReturnType<typeof transactionDetailQueryKey>,
) {
  queryClient.setQueryData(key, { control_id: key[1], status: "completed" });
}
