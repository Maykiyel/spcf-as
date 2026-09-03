// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError } from "axios";
import { MemoryRouter } from "react-router";
import { Notifications } from "@mantine/notifications";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { getUserAccounts } from "../api/get-user-accounts";
import { createUserAccount } from "../api/create-user-account";
import { deleteUserAccount } from "../api/delete-user-account";
import { toggleUserAccountStatus } from "../api/toggle-user-account-status";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/features/auth/types";
import { ManageAccountsPage } from "./manage-accounts-page";
import type { UserAccount } from "../types";

// Seam: the page component, with its fetchers mocked at the module
// boundary. What an admin can see and do — which rows render, what the
// create form submits, what the server's delete refusal looks like on
// screen. Nothing here asserts on modal internals or table plumbing;
// DataTable and useServerTableState have their own tests.
//
// The table is server-backed since backend `4955f19` paginated `/users`,
// so `getUserAccounts` now takes params and answers `{data, total}`. The
// filters are asserted through the params it was called with, because
// that *is* what a server filter does — the rows come back already
// narrowed, and a test that stubbed narrowed rows would pass whatever the
// page sent.

vi.mock("../api/get-user-accounts");
const mockGetUserAccounts = vi.mocked(getUserAccounts);

vi.mock("../api/create-user-account", async () => {
  // The schema is the form's own validation, not a collaborator — mocking it
  // would mean the password rule and the required fields were never exercised.
  const actual = await vi.importActual<
    typeof import("../api/create-user-account")
  >("../api/create-user-account");
  return { ...actual, createUserAccount: vi.fn() };
});
const mockCreateUserAccount = vi.mocked(createUserAccount);

vi.mock("../api/delete-user-account");
const mockDeleteUserAccount = vi.mocked(deleteUserAccount);

vi.mock("../api/toggle-user-account-status");
const mockToggleStatus = vi.mocked(toggleUserAccountStatus);

const DELETION_REFUSED =
  "User cannot be deleted because they have existing related records.";

// Mantine's Select (the toolbar's page-size control) renders its dropdown
// inside a ScrollArea, which subscribes to a ResizeObserver on mount —
// jsdom doesn't implement one. Same stub as service-form.test.tsx.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const accounts: UserAccount[] = [
  {
    id: 1,
    first_name: "Jaypee",
    last_name: "Pahayahay",
    full_name: "Jaypee Pahayahay",
    username: "jaypee",
    role: "cashier",
    is_active: true,
  },
  {
    id: 2,
    first_name: "Maria",
    last_name: "Santos",
    full_name: "Maria Santos",
    username: "msantos",
    role: "admin",
    is_active: true,
  },
];

const deactivatedCashier: UserAccount = {
  id: 4,
  first_name: "Noli",
  last_name: "Cruz",
  full_name: "Noli Cruz",
  username: "ncruz",
  role: "cashier",
  is_active: false,
};

const signedInAdmin: AuthUser = {
  id: 99,
  first_name: "Mike",
  last_name: "Bautista",
  full_name: "Mike Bautista",
  user_name: "mike",
  role: "admin",
};

function renderPage() {
  return renderWithQueryClient(
    <>
      {/* Mounted the way the app mounts it, so a failure that surfaces
          only as a toast is still visible to these tests. */}
      <Notifications />
      <MemoryRouter>
        <ManageAccountsPage />
      </MemoryRouter>
    </>,
  );
}

const newAccount: UserAccount = {
  id: 3,
  first_name: "Ana",
  last_name: "Reyes",
  full_name: "Ana Reyes",
  username: "areyes",
  role: "admin",
  is_active: true,
};

function validationError(errors: Record<string, string[]>): AxiosError {
  const error = new AxiosError("The given data was invalid.");
  error.response = {
    status: 422,
    data: { message: "The given data was invalid.", errors },
  } as AxiosError["response"];
  return error;
}

/** Opens the create modal and fills every field. Returns nothing — each
 * test asserts on what it cares about after submitting. */
async function fillCreateForm(overrides: Partial<Record<string, string>> = {}) {
  fireEvent.click(screen.getByRole("button", { name: /new account/i }));
  await screen.findByLabelText("First Name"); // Mantine's modal transition

  const values = {
    "First Name": "Ana",
    "Last Name": "Reyes",
    Username: "areyes",
    Password: "sup3rsecret",
    ...overrides,
  };

  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

/** Opens the delete confirmation for the first row (Jaypee Pahayahay). */
async function openDeleteConfirmation() {
  fireEvent.click(screen.getAllByRole("button", { name: /^delete$/i })[0]);
  await screen.findByRole("button", { name: /delete account/i });
}

/** The rows themselves, so an assertion about the list can't be satisfied
 * by the same name appearing inside the open confirmation dialog. */
const tableRows = () => within(screen.getByRole("table"));

/** One page of the directory, in the shape `useServerTableState` expects.
 * Every fixture is small enough to be its own single page. */
const page = (rows: UserAccount[]) => ({ data: rows, total: rows.length });

/** The params of the most recent request, which is where a filter change
 * is observable. */
const lastRequest = () =>
  mockGetUserAccounts.mock.calls[mockGetUserAccounts.mock.calls.length - 1][0];

/** Mantine renders each `SegmentedControl` choice as a radio. */
const chooseFilter = (label: string) =>
  fireEvent.click(screen.getByRole("radio", { name: label }));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserAccounts.mockResolvedValue(page(accounts));
  mockCreateUserAccount.mockResolvedValue(newAccount);
  mockDeleteUserAccount.mockResolvedValue(undefined);
  mockToggleStatus.mockResolvedValue({ ...accounts[0], is_active: false });
  useAuthStore.setState({ user: signedInAdmin, status: "authenticated" });
});

describe("ManageAccountsPage", () => {
  it("renders a row per account with its name, username and role", async () => {
    renderPage();

    expect(await screen.findByText("Jaypee Pahayahay")).toBeInTheDocument();
    expect(screen.getByText("jaypee")).toBeInTheDocument();
    expect(tableRows().getByText("Cashier")).toBeInTheDocument();

    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("msantos")).toBeInTheDocument();
    expect(tableRows().getByText("Admin")).toBeInTheDocument();
  });

  it("shows whether each account is active", async () => {
    mockGetUserAccounts.mockResolvedValue(
      page([accounts[0], deactivatedCashier]),
    );
    renderPage();

    await screen.findByText("Jaypee Pahayahay");
    // Scoped to the table: the status filter's own segments are labelled
    // "Active" and "Inactive" too.
    expect(tableRows().getByText("Active")).toBeInTheDocument();
    expect(tableRows().getByText("Inactive")).toBeInTheDocument();
  });

  it("offers no search box, because /users has no search filter", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    // An unknown `filter[]` key is a 400 here, not an ignored parameter, so
    // a search box on this table would fail the first time anyone typed.
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });

  it("asks for the directory unfiltered and ordered by name", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    // `/users` declares no default sort, so unsorted pages arrive in an
    // order the database chooses and rows can repeat across pages.
    expect(lastRequest()).toMatchObject({
      page: 1,
      sorts: [{ key: "full_name", direction: "asc" }],
      filters: { role: null, is_active: null },
    });
  });

  it("narrows the directory to one role at the endpoint", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    chooseFilter("Cashier");

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { role: "cashier", is_active: null },
      }),
    );
  });

  it("narrows the directory to one status at the endpoint", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    // `1`/`0`, not `active`/`inactive`: `filter[is_active]` is a boolean
    // rule over a tinyint, so these are the values the wire takes.
    chooseFilter("Inactive");

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { role: null, is_active: "0" },
      }),
    );
  });

  it("keeps both filters when only one of them changes", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    chooseFilter("Admin");
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { role: "admin" } }),
    );

    chooseFilter("Active");

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        filters: { role: "admin", is_active: "1" },
      }),
    );
  });

  it("says so when the directory is empty", async () => {
    mockGetUserAccounts.mockResolvedValue(page([]));
    renderPage();

    expect(await screen.findByText("No entries found")).toBeInTheDocument();
  });

  it("doesn't claim the directory is empty while it is still loading", async () => {
    mockGetUserAccounts.mockReturnValue(new Promise(() => {})); // never settles
    renderPage();

    expect(screen.queryByText("No entries found")).not.toBeInTheDocument();
  });

  it("surfaces a failure to load the directory in place of the rows", async () => {
    mockGetUserAccounts.mockRejectedValue(new Error("Network down"));
    renderPage();

    expect(
      await screen.findByText("Couldn't load accounts. Please try again."),
    ).toBeInTheDocument();
  });

  it("creates an account with the values entered and shows it in the list", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    await fillCreateForm();
    // Scoped to the modal: the toolbar's role filter has an "Admin" segment
    // of its own, and picking that one would filter the table instead.
    fireEvent.click(within(screen.getByRole("dialog")).getByLabelText("Admin"));

    mockGetUserAccounts.mockResolvedValue(page([...accounts, newAccount]));
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    // Asserting on the payload alone, not the whole call: react-query passes
    // a mutation context as a second argument that the fetcher ignores.
    await waitFor(() => expect(mockCreateUserAccount).toHaveBeenCalledOnce());
    expect(mockCreateUserAccount.mock.calls[0][0]).toEqual({
      first_name: "Ana",
      last_name: "Reyes",
      username: "areyes",
      password: "sup3rsecret",
      role: "admin",
    });

    expect(await screen.findByText("Ana Reyes")).toBeInTheDocument();
  });

  it("shows the server's duplicate-username message against the username field", async () => {
    mockCreateUserAccount.mockRejectedValue(
      validationError({ username: ["The username has already been taken."] }),
    );
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    await fillCreateForm({ Username: "jaypee" });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText("The username has already been taken."),
    ).toBeInTheDocument();
  });

  it("won't submit a password shorter than the client-side minimum", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    await fillCreateForm({ Password: "short" });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/at least 8 characters/i),
    ).toBeInTheDocument();
    expect(mockCreateUserAccount).not.toHaveBeenCalled();
  });

  it("deletes nothing until the admin confirms", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    await openDeleteConfirmation();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockDeleteUserAccount).not.toHaveBeenCalled();
    expect(tableRows().getByText("Jaypee Pahayahay")).toBeInTheDocument();
  });

  it("removes the account from the list once deletion is confirmed", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    await openDeleteConfirmation();
    mockGetUserAccounts.mockResolvedValue(page([accounts[1]]));
    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));

    await waitFor(() => expect(mockDeleteUserAccount).toHaveBeenCalledOnce());
    expect(mockDeleteUserAccount.mock.calls[0][0]).toBe(1);

    await waitFor(() =>
      expect(
        tableRows().queryByText("Jaypee Pahayahay"),
      ).not.toBeInTheDocument(),
    );
  });

  it("states the server's refusal as given and leaves the account in the list", async () => {
    const refusal = new AxiosError(DELETION_REFUSED);
    refusal.response = {
      status: 422,
      data: { message: DELETION_REFUSED },
    } as AxiosError["response"];
    mockDeleteUserAccount.mockRejectedValue(refusal);

    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    await openDeleteConfirmation();
    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));

    expect(await screen.findByText(DELETION_REFUSED)).toBeInTheDocument();
    expect(tableRows().getByText("Jaypee Pahayahay")).toBeInTheDocument();
  });
  it("warns about the series receipt before deactivating a cashier", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    fireEvent.click(
      screen.getAllByRole("button", { name: /^deactivate$/i })[0],
    );
    await screen.findByRole("button", { name: /deactivate account/i });

    expect(screen.getByText(/series receipt/i)).toBeInTheDocument();
    expect(screen.getByText(/suspended/i)).toBeInTheDocument();
    expect(mockToggleStatus).not.toHaveBeenCalled();

    mockGetUserAccounts.mockResolvedValue(
      page([{ ...accounts[0], is_active: false }, accounts[1]]),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /deactivate account/i }),
    );

    await waitFor(() => expect(mockToggleStatus).toHaveBeenCalledOnce());
    expect(mockToggleStatus.mock.calls[0][0]).toEqual({
      id: 1,
      isActive: false,
    });
    expect(await tableRows().findByText("Inactive")).toBeInTheDocument();
  });

  it("omits the series-receipt warning when deactivating an admin", async () => {
    // Only cashiers hold a series, so an admin would be told something
    // untrue. The other half of this pair is "warns about the series
    // receipt before deactivating a cashier", above.
    mockGetUserAccounts.mockResolvedValue(page([accounts[1]]));
    renderPage();
    await screen.findByText("Maria Santos");

    fireEvent.click(screen.getByRole("button", { name: /^deactivate$/i }));
    await screen.findByRole("button", { name: /deactivate account/i });

    expect(screen.queryByText(/series receipt/i)).not.toBeInTheDocument();
  });

  it("changes nothing when the deactivate confirmation is cancelled", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    fireEvent.click(
      screen.getAllByRole("button", { name: /^deactivate$/i })[0],
    );
    await screen.findByRole("button", { name: /deactivate account/i });
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(mockToggleStatus).not.toHaveBeenCalled();
  });

  it("reactivates without asking first", async () => {
    mockGetUserAccounts.mockResolvedValue(page([deactivatedCashier]));
    mockToggleStatus.mockResolvedValue({
      ...deactivatedCashier,
      is_active: true,
    });
    renderPage();
    await screen.findByText("Noli Cruz");

    fireEvent.click(screen.getByRole("button", { name: /^activate$/i }));

    await waitFor(() => expect(mockToggleStatus).toHaveBeenCalledOnce());
    expect(mockToggleStatus.mock.calls[0][0]).toEqual({
      id: 4,
      isActive: true,
    });
  });

  it("says so when a status change fails, rather than leaving the row looking changed", async () => {
    mockGetUserAccounts.mockResolvedValue(page([deactivatedCashier]));
    mockToggleStatus.mockRejectedValue(new Error("Network down"));
    renderPage();
    await screen.findByText("Noli Cruz");

    fireEvent.click(screen.getByRole("button", { name: /^activate$/i }));

    expect(
      await screen.findByText("Couldn't change this account's status."),
    ).toBeInTheDocument();
    expect(tableRows().getByText("Inactive")).toBeInTheDocument();
  });

  it("offers no status or delete action on the signed-in admin's own row", async () => {
    useAuthStore.setState({
      user: { ...signedInAdmin, id: accounts[1].id },
      status: "authenticated",
    });
    renderPage();
    await screen.findByText("Maria Santos");

    // One row still has its actions; the admin's own row has none.
    expect(screen.getAllByRole("button", { name: /^delete$/i })).toHaveLength(
      1,
    );
    expect(
      screen.getAllByRole("button", { name: /^deactivate$/i }),
    ).toHaveLength(1);
  });
});
