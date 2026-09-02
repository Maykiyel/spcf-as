// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { theme } from "@/config/theme";
import { DataTable } from "./index";
import type { ColumnDef, DataTableContextValue } from "./types";

// Seam: the toolbar composed under a real DataTable.Root, with the table
// state hand-built as a test double. The state hooks have their own tests;
// what matters here is only which controls a given composition renders.

// Mantine's Select renders its dropdown inside a ScrollArea, which
// subscribes to a ResizeObserver on mount — jsdom doesn't implement one.
// Same stub as service-form.test.tsx, for the same reason.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

type Row = { id: string };

const columns: ColumnDef<Row>[] = [{ key: "id", header: "ID" }];

function stubState(
  overrides: Partial<DataTableContextValue<Row>> = {},
): DataTableContextValue<Row> {
  return {
    columns,
    rows: [],
    totalCount: 0,
    isLoading: false,
    isError: false,
    errorMessage: null,
    page: 1,
    pageSize: 25,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    searchQuery: "",
    onSearchChange: vi.fn(),
    sorts: [],
    onSort: vi.fn(),
    ...overrides,
  };
}

function renderToolbar(
  children: ReactNode,
  state: DataTableContextValue<Row> = stubState(),
) {
  return render(
    <MantineProvider theme={theme}>
      <DataTable.Root title="Widgets" state={state}>
        <DataTable.Toolbar>{children}</DataTable.Toolbar>
      </DataTable.Root>
    </MantineProvider>,
  );
}

describe("DataTable.Toolbar", () => {
  it("renders no search input when composed without the search piece", () => {
    renderToolbar(<DataTable.PageSize />);

    expect(screen.getByText("entries")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });

  it("renders both pieces when composed with both", () => {
    renderToolbar(
      <>
        <DataTable.PageSize />
        <DataTable.Search />
      </>,
    );

    expect(screen.getByText("entries")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  it("renders a feature's own filter control alongside the shared pieces", () => {
    renderToolbar(
      <>
        <DataTable.PageSize />
        <button type="button">Only active</button>
        <DataTable.Search />
      </>,
    );

    expect(
      screen.getByRole("button", { name: "Only active" }),
    ).toBeInTheDocument();
  });

  it("renders neither piece when given no children", () => {
    // `children` is required, so this is a type error at every real call
    // site — the cast is what lets the test prove there's no runtime
    // fallback hiding behind the compile-time guard.
    render(
      <MantineProvider theme={theme}>
        <DataTable.Root title="Widgets" state={stubState()}>
          <DataTable.Toolbar {...({} as { children: ReactNode })} />
        </DataTable.Root>
      </MantineProvider>,
    );

    expect(screen.queryByText("entries")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
  });
});
