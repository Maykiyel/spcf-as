// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { getServices } from "../api/get-services";
import { ServiceTable } from "./service-table";
import type { Service } from "@/api/services";

// Seam: the table component, fetcher mocked at the module boundary.
//
// Filters are asserted through the params `getServices` received. The
// failure this catches is silent: a filter that reaches the request but
// not the query key is answered from the previous filter's cache, and
// nothing on screen says the rows are wrong.

vi.mock("../api/get-services", async () => {
  // A factory, not a bare `vi.mock`: automock empties exported arrays, so
  // this module's sort plan would silently become a table with no sort.
  const actual = await vi.importActual<typeof import("../api/get-services")>("../api/get-services");
  return { ...actual, getServices: vi.fn() };
});
const mockGetServices = vi.mocked(getServices);

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

const services: Service[] = [
  {
    id: 1,
    name: "SHS GRADUATION FEE",
    price: 5100,
    description: "Senior high graduation",
    is_active: true,
    item_code: { id: 9, name: "GRADUATION FEE" },
  },
  {
    id: 2,
    name: "AUGUST RENT",
    price: 1200,
    description: null,
    is_active: false,
    item_code: { id: 4, name: "RENTAL" },
  },
];

const page = (rows: Service[]) => ({ data: rows, total: rows.length });

function lastRequest() {
  const calls = mockGetServices.mock.calls;
  return calls[calls.length - 1]?.[0];
}

// The segments are labelled "Active" and "Inactive" — the same words the
// rows' own active toggles carry — so the click is scoped to the control.
function chooseStatus(label: string) {
  const control = screen.getByLabelText("Status");
  fireEvent.click(within(control).getByText(label));
}

// MemoryRouter keeps its history off `window.location`, so the query
// string has to be read back through the router rather than the browser's.
function LocationProbe() {
  return <div data-testid="search">{useLocation().search}</div>;
}

function renderTable() {
  return renderWithQueryClient(
    <MemoryRouter>
      <ServiceTable onEdit={vi.fn()} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("ServiceTable", () => {
  beforeEach(() => {
    mockGetServices.mockReset();
    mockGetServices.mockResolvedValue(page(services));
  });

  it("asks for the catalog unfiltered to begin with", async () => {
    renderTable();
    await screen.findByText("SHS GRADUATION FEE");

    expect(lastRequest()).toMatchObject({
      page: 1,
      filters: { is_active: null },
    });
  });

  it("narrows the catalog to active services at the endpoint", async () => {
    renderTable();
    await screen.findByText("SHS GRADUATION FEE");

    // `1`/`0`, not `active`/`inactive`: `filter[is_active]` is a boolean
    // rule over a tinyint, so these are the values the wire takes.
    chooseStatus("Active");

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { is_active: "1" } }),
    );
  });

  it("narrows the catalog to inactive services at the endpoint", async () => {
    renderTable();
    await screen.findByText("SHS GRADUATION FEE");

    chooseStatus("Inactive");

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { is_active: "0" } }),
    );
  });

  it("drops the filter again when the status goes back to All", async () => {
    renderTable();
    await screen.findByText("SHS GRADUATION FEE");

    chooseStatus("Inactive");
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { is_active: "0" } }),
    );

    chooseStatus("All");

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { is_active: null } }),
    );
  });

  it("persists the status in the URL, so a refresh keeps it", async () => {
    renderTable();
    await screen.findByText("SHS GRADUATION FEE");

    chooseStatus("Active");

    // `services_is_active=1`, not `services_status=active`. The declared
    // key has to be the API's own filter name, which is what changed the
    // URL — a deliberate soft break, since an undeclared param is ignored
    // on read and an old bookmark shows the unfiltered table.
    await waitFor(() =>
      expect(screen.getByTestId("search").textContent).toContain(
        "services_is_active=1",
      ),
    );
  });

  it("keeps the status filter when the search changes", async () => {
    renderTable();
    await screen.findByText("SHS GRADUATION FEE");

    chooseStatus("Active");
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { is_active: "1" } }),
    );

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "rent" },
    });

    // `/services` is one of the three endpoints that takes `filter[search]`,
    // so the box is composed here and both narrow the same request.
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        search: "rent",
        filters: { is_active: "1" },
      }),
    );
  });

  it("keeps the status filter when the page changes", async () => {
    // 60 rows over a page size of 25, so there is a second page to ask for.
    mockGetServices.mockResolvedValue({ data: services, total: 60 });
    renderTable();
    await screen.findByText("SHS GRADUATION FEE");

    chooseStatus("Active");
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { is_active: "1" } }),
    );

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        page: 2,
        filters: { is_active: "1" },
      }),
    );
  });

  it("goes back to the first page when the status changes", async () => {
    mockGetServices.mockResolvedValue({ data: services, total: 60 });
    renderTable();
    await screen.findByText("SHS GRADUATION FEE");

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(lastRequest()).toMatchObject({ page: 2 }));

    // Behaviour the shared mechanism adds — the bespoke hook left
    // `services_page` alone, which could land the user on a page number
    // the narrowed result set no longer has.
    chooseStatus("Inactive");

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        page: 1,
        filters: { is_active: "0" },
      }),
    );
  });

  it("keeps the status filter when a column is sorted", async () => {
    renderTable();
    await screen.findByText("SHS GRADUATION FEE");

    chooseStatus("Active");
    await waitFor(() =>
      expect(lastRequest()).toMatchObject({ filters: { is_active: "1" } }),
    );

    fireEvent.click(screen.getByText("Service"));

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        sorts: [{ key: "name", direction: "asc" }],
        filters: { is_active: "1" },
      }),
    );
  });
});
