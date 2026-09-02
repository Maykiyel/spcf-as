// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { fireEvent } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { getUserAccounts } from "../api/get-user-accounts";
import { ManageAccountsPage } from "./manage-accounts-page";
import type { UserAccount } from "../types";

// Seam: the page component, with its fetchers mocked at the module
// boundary. What an admin can see and do — which rows render, what the
// create form submits, what the server's delete refusal looks like on
// screen. Nothing here asserts on modal internals or table plumbing;
// DataTable and useClientTableState have their own tests.

vi.mock("../api/get-user-accounts");
const mockGetUserAccounts = vi.mocked(getUserAccounts);

// Mantine's Select (the page-size control, and the role field) renders its
// dropdown inside a ScrollArea, which subscribes to a ResizeObserver on
// mount — jsdom doesn't implement one. Same stub as service-form.test.tsx.
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

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserAccounts.mockResolvedValue(accounts);
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
});
