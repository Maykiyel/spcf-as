// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError } from "axios";
import { MemoryRouter } from "react-router";
import { fireEvent, waitFor } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { getUserAccounts } from "../api/get-user-accounts";
import { createUserAccount } from "../api/create-user-account";
import { ManageAccountsPage } from "./manage-accounts-page";
import type { UserAccount } from "../types";

// Seam: the page component, with its fetchers mocked at the module
// boundary. What an admin can see and do — which rows render, what the
// create form submits, what the server's delete refusal looks like on
// screen. Nothing here asserts on modal internals or table plumbing;
// DataTable and useClientTableState have their own tests.

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
    user_name: "jaypee",
    email: "jaypee@spcf.edu.ph",
    role: "cashier",
  },
  {
    id: 2,
    first_name: "Maria",
    last_name: "Santos",
    full_name: "Maria Santos",
    user_name: "msantos",
    email: "maria@spcf.edu.ph",
    role: "admin",
  },
];

function renderPage() {
  return renderWithQueryClient(
    <MemoryRouter>
      <ManageAccountsPage />
    </MemoryRouter>,
  );
}

const newAccount: UserAccount = {
  id: 3,
  first_name: "Ana",
  last_name: "Reyes",
  full_name: "Ana Reyes",
  user_name: "areyes",
  email: "ana@spcf.edu.ph",
  role: "admin",
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
async function fillCreateForm(
  overrides: Partial<Record<string, string>> = {},
) {
  fireEvent.click(screen.getByRole("button", { name: /new account/i }));
  await screen.findByLabelText("First Name"); // Mantine's modal transition

  const values = {
    "First Name": "Ana",
    "Last Name": "Reyes",
    Username: "areyes",
    "Email Address": "ana@spcf.edu.ph",
    Password: "sup3rsecret",
    ...overrides,
  };

  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserAccounts.mockResolvedValue(accounts);
  mockCreateUserAccount.mockResolvedValue(newAccount);
});

describe("ManageAccountsPage", () => {
  it("renders a row per account with its name, username, email and role", async () => {
    renderPage();

    expect(await screen.findByText("Jaypee Pahayahay")).toBeInTheDocument();
    expect(screen.getByText("jaypee")).toBeInTheDocument();
    expect(screen.getByText("jaypee@spcf.edu.ph")).toBeInTheDocument();
    expect(screen.getByText("Cashier")).toBeInTheDocument();

    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.getByText("msantos")).toBeInTheDocument();
    expect(screen.getByText("maria@spcf.edu.ph")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("narrows the list to matching accounts as the admin searches", async () => {
    renderPage();
    await screen.findByText("Jaypee Pahayahay");

    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "maria" },
    });

    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.queryByText("Jaypee Pahayahay")).not.toBeInTheDocument();
  });

  it("says so when the directory is empty", async () => {
    mockGetUserAccounts.mockResolvedValue([]);
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
    fireEvent.click(screen.getByLabelText("Admin"));

    mockGetUserAccounts.mockResolvedValue([...accounts, newAccount]);
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    // Asserting on the payload alone, not the whole call: react-query passes
    // a mutation context as a second argument that the fetcher ignores.
    await waitFor(() => expect(mockCreateUserAccount).toHaveBeenCalledOnce());
    expect(mockCreateUserAccount.mock.calls[0][0]).toEqual({
      first_name: "Ana",
      last_name: "Reyes",
      username: "areyes",
      email: "ana@spcf.edu.ph",
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
});
