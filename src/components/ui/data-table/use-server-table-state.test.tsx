// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useServerTableState } from "./use-server-table-state";
import type { ColumnDef, TableFilters } from "./types";

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Name" },
];

// A Router is required even for a table with no `urlKey`: both adapters in
// `useTableControls` are always instantiated so hook call order stays stable,
// and the URL one calls `useSearchParams` regardless of which is returned.
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
function renderTable(
  options: Parameters<typeof useServerTableState<Row>>[0],
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
    // The failure this guards is silent: the workaround this replaced passed
    // filters to the fetcher but left them out of the query key, so changing
    // a filter re-rendered with the old filter's cached rows and no error.
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
