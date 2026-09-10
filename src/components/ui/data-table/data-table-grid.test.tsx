// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { theme } from "@/config/theme";
import { DataTable } from "./index";
import type { ResolvedColumn, DataTableProviderValue } from "./types";

// Seam: the grid under a real DataTable.Root, with the table state
// hand-built as a double. Two behaviours here fail silently:
//
// - `sortKey`: a wrong sort name is a 422 that the recovery path swallows
//   into a toast, so the assertion is on the name `onSort` was handed.
// - The interactive-element guard: without it a row's Void button also
//   navigates away, and the void still happens.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

type Row = { id: string; name: string; recorded: string };

const rows: Row[] = [
  { id: "1", name: "Juan Dela Cruz", recorded: "2026-08-24" },
  { id: "2", name: "Maria Santos", recorded: "2026-08-25" },
];

function stubState(
  overrides: Partial<DataTableProviderValue<Row>> = {},
): DataTableProviderValue<Row> {
  return {
    columns: [],
    rows,
    totalCount: rows.length,
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
    filters: {},
    setFilters: vi.fn(),
    ...overrides,
  };
}

function renderGrid(
  columns: ResolvedColumn<Row>[],
  {
    onRowClick,
    ...overrides
  }: Partial<DataTableProviderValue<Row>> & {
    onRowClick?: (row: Row) => void;
  } = {},
) {
  render(
    <MantineProvider theme={theme}>
      <DataTable.Root title="Rows" state={stubState({ columns, ...overrides })}>
        <DataTable.Grid onRowClick={onRowClick} />
      </DataTable.Root>
    </MantineProvider>,
  );
}

/** The row a given name is in, so a click lands on the row rather than on
 * the whole table. */
const rowFor = (name: string) => screen.getByText(name).closest("tr")!;

describe("DataTable.Grid — sort keys", () => {
  it("sorts by the column's key when it names no other", () => {
    const onSort = vi.fn();
    renderGrid([{ field: "name", header: "Name", sortable: true }], { onSort });

    fireEvent.click(screen.getByText("Name"));

    expect(onSort).toHaveBeenCalledExactlyOnceWith("name");
  });

  it("sorts by `sortKey` when the endpoint knows the column by another name", () => {
    // `/transactions` returns this column in `date` and sorts it as
    // `created_at`. Sending the field name is a 422.
    const onSort = vi.fn();
    renderGrid(
      [
        {
          field: "recorded",
          sortKey: "created_at",
          header: "Date",
          sortable: true,
        },
      ],
      { onSort },
    );

    fireEvent.click(screen.getByText("Date"));

    expect(onSort).toHaveBeenCalledExactlyOnceWith("created_at");
  });

  it("marks a column sorted by matching on `sortKey`, not on the field", () => {
    // The caret is drawn with opacity, so `aria-sort` is the only handle
    // for it. A grid that matched on `key` here would show an unsorted
    // header over rows the endpoint had plainly ordered.
    renderGrid(
      [
        {
          field: "recorded",
          sortKey: "created_at",
          header: "Date",
          sortable: true,
        },
      ],
      { sorts: [{ key: "created_at", direction: "desc" }] },
    );

    expect(screen.getByRole("columnheader", { name: /date/i })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });
});

describe("DataTable.Grid — rows that navigate", () => {
  const columns: ResolvedColumn<Row>[] = [
    { field: "name", header: "Name", sortable: false },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      render: () => (
        <button type="button" onClick={() => undefined}>
          Void
        </button>
      ),
    },
  ];

  it("reports the row that was clicked", () => {
    const onRowClick = vi.fn();
    renderGrid(columns, { onRowClick });

    fireEvent.click(screen.getByText("Maria Santos"));

    expect(onRowClick).toHaveBeenCalledExactlyOnceWith(rows[1]);
  });

  it("does not fire when the click landed on a control inside the row", () => {
    // The click still reaches the button — this asserts only that it isn't
    // *also* a row click. #62's Void button is the case.
    const onRowClick = vi.fn();
    renderGrid(columns, { onRowClick });

    fireEvent.click(
      within(rowFor("Juan Dela Cruz")).getByRole("button", { name: "Void" }),
    );

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("does not fire when the click landed on a link inside the row", () => {
    const onRowClick = vi.fn();
    renderGrid(
      [
        {
          field: "name",
          header: "Name",
          sortable: false,
          // `preventDefault` only so jsdom does not log an unimplemented
          // navigation. It does not stop propagation, so the guard under
          // test still sees the click.
          render: (row) => (
            <a href={`/rows/${row.id}`} onClick={(e) => e.preventDefault()}>
              {row.name}
            </a>
          ),
        },
      ],
      { onRowClick },
    );

    fireEvent.click(screen.getByRole("link", { name: "Juan Dela Cruz" }));

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("leaves rows inert when no handler is given", () => {
    renderGrid(columns);

    // No pointer cursor either: a row that looks clickable and isn't is
    // worse than one that looks like what it is.
    expect(rowFor("Juan Dela Cruz")).not.toHaveStyle({ cursor: "pointer" });
  });
});
