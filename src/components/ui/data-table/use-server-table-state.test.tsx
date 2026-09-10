// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useServerTableState } from "./use-server-table-state";
import type { ColumnDef, SortEntry, TableFilters } from "./types";
import type { DateRangePeriod } from "./date-range-filter";
import type { SortPlan } from "./sort-plan";

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [
  { field: "id", header: "ID" },
  { field: "name", header: "Name" },
];

// A Router is required even with no `urlKey`: both adapters are always
// instantiated, and the URL one calls `useSearchParams` regardless.
function createWrapper(initialEntries: string[] = ["/"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
  };
}

/** Reads the query string alongside the hook, so a test can assert on what
 * a shared link would actually carry rather than on internal state. */
function renderTable<TMeta = undefined>(
  options: Parameters<typeof useServerTableState<Row, TMeta>>[0],
  initialEntries?: string[],
) {
  return renderHook(
    () => ({ table: useServerTableState(options), search: useLocation().search }),
    { wrapper: createWrapper(initialEntries) },
  );
}

/** A fetcher that answers with rows derived from the filters it was given,
 * so a stale-cache bug shows up as the wrong rows rather than only as a
 * missing call. */
function createFetcher() {
  return vi.fn(async ({ filters }: { filters?: TableFilters }) => ({
    data: [{ id: `${filters?.status ?? "none"}-1`, name: "Row" }],
    total: 1,
  }));
}

describe("useServerTableState filters", () => {
  let queryFn: ReturnType<typeof createFetcher>;

  beforeEach(() => {
    queryFn = createFetcher();
  });

  it("passes the declared filters to the fetcher", async () => {
    renderHook(
      () =>
        useServerTableState({
          queryKey: ["widgets"],
          queryFn,
          columns,
          initialFilters: { status: "active" },
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
    expect(queryFn).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { status: "active" } }),
    );
  });

  it("refetches on a filter change instead of serving the previous filter's rows", async () => {
    // The failure this guards is silent. Passing filters to the fetcher
    // without putting them in the query key re-renders with the old filter's
    // cached rows and no error at all.
    const { result } = renderHook(
      () =>
        useServerTableState({
          queryKey: ["widgets"],
          queryFn,
          columns,
          initialFilters: { status: "active" },
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.rows).toEqual([
      { id: "active-1", name: "Row" },
    ]));

    act(() => result.current.setFilters({ status: "inactive" }));

    await waitFor(() => expect(result.current.rows).toEqual([
      { id: "inactive-1", name: "Row" },
    ]));
  });

  it("resets to the first page when a filter changes", async () => {
    const { result } = renderHook(
      () =>
        useServerTableState({
          queryKey: ["widgets"],
          queryFn,
          columns,
          initialFilters: { status: "active" },
        }),
      { wrapper: createWrapper() },
    );

    act(() => result.current.onPageChange(3));
    await waitFor(() => expect(result.current.page).toBe(3));

    act(() => result.current.setFilters({ status: "inactive" }));
    await waitFor(() => expect(result.current.page).toBe(1));
  });

  it("merges a patch rather than replacing the whole bag", async () => {
    // A date range moves both of its ends in one call; everything else it
    // sits next to has to survive that.
    const { result } = renderHook(
      () =>
        useServerTableState({
          queryKey: ["widgets"],
          queryFn,
          columns,
          initialFilters: { status: "active", from_date: null, to_date: null },
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalled());

    act(() =>
      result.current.setFilters({
        from_date: "2026-08-01",
        to_date: "2026-08-31",
      }),
    );

    await waitFor(() =>
      expect(result.current.filters).toEqual({
        status: "active",
        from_date: "2026-08-01",
        to_date: "2026-08-31",
      }),
    );
  });

  it("leaves a table that declares no filters sending none", async () => {
    renderHook(
      () => useServerTableState({ queryKey: ["widgets"], queryFn, columns }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
    expect(queryFn.mock.calls[0][0].filters).toEqual({});
  });
});

describe("useServerTableState filter URL persistence", () => {
  let queryFn: ReturnType<typeof createFetcher>;

  beforeEach(() => {
    queryFn = createFetcher();
  });

  const options = (extra: Record<string, unknown>) =>
    ({ queryKey: ["widgets"], queryFn, columns, ...extra }) as Parameters<
      typeof useServerTableState<Row>
    >[0];

  it("writes a changed filter to the URL, namespaced by urlKey", async () => {
    const { result } = renderTable(
      options({ urlKey: "tx", initialFilters: { status: null } }),
    );

    act(() => result.current.table.setFilters({ status: "completed" }));

    await waitFor(() =>
      expect(result.current.search).toContain("tx_status=completed"),
    );
  });

  it("omits a filter sitting at its declared default", async () => {
    // `?status=all` is noise in a shared link, and it makes an unfiltered
    // table look filtered.
    const { result } = renderTable(
      options({ urlKey: "tx", initialFilters: { status: "all" } }),
    );

    act(() => result.current.table.setFilters({ status: "completed" }));
    await waitFor(() =>
      expect(result.current.search).toContain("tx_status=completed"),
    );

    act(() => result.current.table.setFilters({ status: "all" }));
    await waitFor(() =>
      expect(result.current.search).not.toContain("tx_status"),
    );
  });

  it("restores filters from the URL", async () => {
    // One assertion covering three criteria: a refresh, a pasted link and a
    // history entry are all just "the hook is mounted at this URL".
    const { result } = renderTable(
      options({
        urlKey: "tx",
        initialFilters: { status: null, from_date: null },
      }),
      ["/?tx_status=completed&tx_from_date=2026-08-01"],
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
    expect(result.current.table.filters).toEqual({
      status: "completed",
      from_date: "2026-08-01",
    });
  });

  it("keeps two tables on one page independent", async () => {
    const { result } = renderHook(
      () => ({
        tx: useServerTableState({
          queryKey: ["tx"],
          queryFn,
          columns,
          urlKey: "tx",
          initialFilters: { status: null },
        }),
        logs: useServerTableState({
          queryKey: ["logs"],
          queryFn,
          columns,
          urlKey: "logs",
          initialFilters: { status: null },
        }),
        search: useLocation().search,
      }),
      { wrapper: createWrapper() },
    );

    act(() => result.current.tx.setFilters({ status: "completed" }));

    await waitFor(() =>
      expect(result.current.search).toContain("tx_status=completed"),
    );
    expect(result.current.logs.filters.status).toBeNull();
    expect(result.current.search).not.toContain("logs_status");
  });

  it("clears the page param when a filter changes", async () => {
    const { result } = renderTable(
      options({ urlKey: "tx", initialFilters: { status: null } }),
      ["/?tx_page=3"],
    );

    await waitFor(() => expect(result.current.table.page).toBe(3));

    act(() => result.current.table.setFilters({ status: "completed" }));

    await waitFor(() => expect(result.current.search).not.toContain("tx_page"));
    expect(result.current.table.page).toBe(1);
  });

  it("ignores a URL param for a filter the table hasn't declared", async () => {
    // Only declared keys are read, so a hand-edited link can't inject a
    // filter key the endpoint would answer with a 400.
    const { result } = renderTable(
      options({ urlKey: "tx", initialFilters: { status: null } }),
      ["/?tx_status=completed&tx_cashier_id=7"],
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
    expect(result.current.table.filters).toEqual({ status: "completed" });
  });

  it("keeps filters in local state when the table hasn't opted in", async () => {
    const { result } = renderTable(
      options({ initialFilters: { status: null } }),
    );

    act(() => result.current.table.setFilters({ status: "completed" }));

    await waitFor(() =>
      expect(result.current.table.filters.status).toBe("completed"),
    );
    expect(result.current.search).toBe("");
  });
});

describe("useServerTableState filter guards", () => {
  let queryFn: ReturnType<typeof createFetcher>;

  beforeEach(() => {
    queryFn = createFetcher();
  });

  const options = (extra: Record<string, unknown>) =>
    ({ queryKey: ["widgets"], queryFn, columns, ...extra }) as Parameters<
      typeof useServerTableState<Row>
    >[0];

  // Declaring `dateRange` is what supplies the guard. `DateRangeFilter` never
  // emits a half-picked range, but a restored URL can still carry one, so the
  // guard has to exist here as well as in the control.
  it("fires no request while the range is half-restored", async () => {
    const { result } = renderTable(
      options({ urlKey: "tx", dateRange: {} }),
      ["/?tx_from_date=2026-08-01"],
    );

    await waitFor(() => expect(result.current.table.isLoading).toBe(false));
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.table.rows).toEqual([]);
  });

  it("fires once the range is completed", async () => {
    const { result } = renderTable(
      options({ urlKey: "tx", dateRange: {} }),
      ["/?tx_from_date=2026-08-01"],
    );

    await waitFor(() => expect(result.current.table.isLoading).toBe(false));
    expect(queryFn).not.toHaveBeenCalled();

    act(() => result.current.table.setFilters({ to_date: "2026-08-31" }));

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    expect(queryFn).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { from_date: "2026-08-01", to_date: "2026-08-31" },
      }),
    );
  });

  it("declares the range's two keys without the page naming them", async () => {
    renderTable(options({ urlKey: "tx", dateRange: {} }), [
      "/?tx_from_date=2026-08-01&tx_to_date=2026-08-31",
    ]);

    await waitFor(() =>
      expect(queryFn).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { from_date: "2026-08-01", to_date: "2026-08-31" },
        }),
      ),
    );
  });

  it("opens on the declared default, and keeps it off the URL", async () => {
    const { result } = renderTable(
      options({
        urlKey: "tx",
        dateRange: {
          required: true,
          default: () => ({ from: "2026-09-01", to: "2026-09-30" }),
        },
      }),
    );

    await waitFor(() =>
      expect(queryFn).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { from_date: "2026-09-01", to_date: "2026-09-30" },
        }),
      ),
    );
    expect(result.current.table.period).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    // A filter at its declared value is absent from the URL.
    expect(result.current.search).not.toContain("tx_from_date");
  });

  it("blocks an absent range only when the endpoint requires both ends", async () => {
    // `GET /reports/services-sold/{service}` validates both as `required`,
    // where the looser guard would send an unfiltered request.
    renderTable(options({ urlKey: "tx", dateRange: { required: true } }));

    await waitFor(() => expect(queryFn).not.toHaveBeenCalled());

    renderTable(options({ urlKey: "opt", dateRange: {} }));

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
  });

  it("requests as normal when the table declares no range", async () => {
    renderTable(
      options({ urlKey: "tx", initialFilters: { from_date: null } }),
      ["/?tx_from_date=2026-08-01"],
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
  });

  it("ignores a write to a filter the table hasn't declared", async () => {
    // Reading already ignores undeclared keys. Accepting one on write would
    // put a param in the URL that nothing ever reads back.
    const { result } = renderTable(
      options({ urlKey: "tx", initialFilters: { status: null } }),
    );

    act(() =>
      result.current.table.setFilters({ status: "completed", nonsense: "x" }),
    );

    await waitFor(() =>
      expect(result.current.search).toContain("tx_status=completed"),
    );
    expect(result.current.search).not.toContain("nonsense");
    expect(result.current.table.filters).toEqual({ status: "completed" });
  });
});

describe("useServerTableState columns", () => {
  it("hands a columns function the period the table resolved to", async () => {
    // The Services Sold row link needs the period, which isn't known until
    // after this hook runs — the reason `columns` accepts a function.
    const queryFn = createFetcher();
    const build = vi.fn(
      ({ period }: { period: DateRangePeriod }): ColumnDef<Row>[] => [
        { field: "name", header: `Rows for ${period.from}` },
      ],
    );

    const { result } = renderTable(
      {
        queryKey: ["widgets"],
        queryFn,
        columns: build,
        urlKey: "tx",
        dateRange: { required: true },
      } as Parameters<typeof useServerTableState<Row>>[0],
      ["/?tx_from_date=2026-08-01&tx_to_date=2026-08-31"],
    );

    await waitFor(() =>
      expect(result.current.table.columns[0].header).toBe(
        "Rows for 2026-08-01",
      ),
    );
    expect(build).toHaveBeenCalledWith({
      period: { from: "2026-08-01", to: "2026-08-31" },
    });
  });
});

describe("useServerTableState meta", () => {
  it("hands back the value the fetcher returned beside the rows", async () => {
    const queryFn = vi.fn(async () => ({
      data: [{ id: "1", name: "Row" }],
      total: 1,
      meta: 48250,
    }));

    const { result } = renderTable({ queryKey: ["widgets"], queryFn, columns });

    await waitFor(() => expect(result.current.table.meta).toBe(48250));
  });

  it("reports no meta before the first response lands", async () => {
    const queryFn = vi.fn(
      () => new Promise<never>(() => {}), // never settles
    );

    const { result } = renderTable({ queryKey: ["widgets"], queryFn, columns });

    // Undefined rather than a zero: the page has to be able to tell "not
    // loaded yet" from a genuine total of nothing.
    expect(result.current.table.meta).toBeUndefined();
  });
});

describe("useServerTableState initial sort", () => {
  let queryFn: ReturnType<typeof createFetcher>;

  const DEFAULT_SORTS: SortEntry[] = [{ key: "name", direction: "desc" }];
  const DEFAULT_PLAN: SortPlan = {
    allowed: ["name", "id"],
    default: DEFAULT_SORTS,
  };

  beforeEach(() => {
    queryFn = createFetcher();
  });

  it("sends the declared sort on the first request", async () => {
    renderTable({
      queryKey: ["widgets"],
      queryFn,
      columns,
      sortPlan: DEFAULT_PLAN,
    });

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
    expect(queryFn).toHaveBeenCalledWith(
      expect.objectContaining({ sorts: DEFAULT_SORTS }),
    );
  });

  it("reports the declared sort so the header can show its caret", async () => {
    const { result } = renderTable({
      queryKey: ["widgets"],
      queryFn,
      columns,
      sortPlan: DEFAULT_PLAN,
    });

    expect(result.current.table.sorts).toEqual(DEFAULT_SORTS);
  });

  it("keeps the declared sort out of the URL, like every other default", async () => {
    const { result } = renderTable({
      queryKey: ["widgets"],
      queryFn,
      columns,
      urlKey: "tx",
      sortPlan: DEFAULT_PLAN,
    });

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
    expect(result.current.search).toBe("");
  });

  it("flips a declared descending column instead of unsorting the table", async () => {
    // The flip has to reach the URL: `name:asc` is not the declared sort,
    // and an absent param reads back as `name:desc`.
    const flipped = [{ key: "name", direction: "asc" }];
    const { result } = renderTable({
      queryKey: ["widgets"],
      queryFn,
      columns,
      urlKey: "tx",
      sortPlan: DEFAULT_PLAN,
    });

    act(() => result.current.table.onSort("name"));

    await waitFor(() => expect(result.current.table.sorts).toEqual(flipped));
    expect(queryFn).toHaveBeenLastCalledWith(
      expect.objectContaining({ sorts: flipped }),
    );
    expect(new URLSearchParams(result.current.search).get("tx_sort")).toBe(
      "name:asc",
    );
  });

  it("restores an explicitly unsorted table from the URL", async () => {
    const { result } = renderTable(
      {
        queryKey: ["widgets"],
        queryFn,
        columns,
        urlKey: "tx",
        sortPlan: DEFAULT_PLAN,
      },
      ["/?tx_sort=none"],
    );

    expect(result.current.table.sorts).toEqual([]);
  });

  it("leaves a table that declares no sort unsorted", async () => {
    renderTable({ queryKey: ["widgets"], queryFn, columns });

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
    expect(queryFn).toHaveBeenCalledWith(
      expect.objectContaining({ sorts: [] }),
    );
  });
});
