// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, useLocation } from "react-router";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { screen, renderWithQueryClient } from "@/test/render";
import { getServices } from "../api/get-services";
import { ServiceTable } from "./service-table";
import type { Service } from "@/api/services";

// Seam: the table component with its fetcher mocked at the module
// boundary. Filters are asserted through the params `getServices` was
// called with, because that *is* what a server filter does — the rows come
// back already narrowed, and a test that stubbed narrowed rows would pass
// whatever the table sent. Same reasoning as manage-accounts-page.test.tsx.
//
// This is the migration's real failure mode. Before #84 the filter reached
// the request but not the query key, so a filter change could be answered
// from the previous filter's cache with no error anywhere — nothing on
// screen says the rows are wrong. Asserting on the params is what catches
// the value going missing from either.

vi.mock("../api/get-services");
const mockGetServices = vi.mocked(getServices);

// Mantine's page-size Select and `DataTable.Grid` both subscribe to a
// ResizeObserver on mount, which jsdom doesn't implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

// Mantine's Combobox scrolls its active option into view on open, and
// jsdom implements no scrolling. Without this the Select throws outside
// the assertion, as an unhandled rejection — every test stays green while
// the run exits non-zero.
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
