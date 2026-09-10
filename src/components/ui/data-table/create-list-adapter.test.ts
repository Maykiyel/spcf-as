import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/axios/api-client";
import { createListAdapter } from "./create-list-adapter";
import type { ServerTableParams } from "./use-server-table-state";

vi.mock("@/lib/axios/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

const baseParams: ServerTableParams = {
  page: 1,
  per_page: 25,
  sorts: [],
};

describe("createListAdapter", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("requests the given URL with per_page, page, and encoded sort", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets: [], pagination: { total: 0 } },
    } as any);

    const getWidgets = createListAdapter<{ id: string }>("/widgets", "widgets");
    await getWidgets({
      ...baseParams,
      page: 2,
      per_page: 10,
      sorts: [{ key: "name", direction: "desc" }],
    });

    expect(apiClient.get).toHaveBeenCalledWith("/widgets", {
      params: {
        per_page: 10,
        page: 2,
        sort: "-name",
      },
    });
  });

  it("forwards params.search as filter[search] when the endpoint supports search", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets: [], pagination: { total: 0 } },
    } as any);

    const getWidgets = createListAdapter<{ id: string }>(
      "/widgets",
      "widgets",
      { supportsSearch: true },
    );
    await getWidgets({ ...baseParams, search: "gadget" });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/widgets",
      expect.objectContaining({
        params: expect.objectContaining({ "filter[search]": "gadget" }),
      }),
    );
  });

  it("never sends a search key for an endpoint that hasn't opted in", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets: [], pagination: { total: 0 } },
    } as any);

    const getWidgets = createListAdapter<{ id: string }>("/widgets", "widgets");
    await getWidgets({ ...baseParams, search: "gadget" });

    const [, config] = vi.mocked(apiClient.get).mock.calls[0];
    expect(config!.params).not.toHaveProperty("filter[search]");
  });

  it("omits the search key when an opted-in endpoint has no search term", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets: [], pagination: { total: 0 } },
    } as any);

    const getWidgets = createListAdapter<{ id: string }>(
      "/widgets",
      "widgets",
      { supportsSearch: true },
    );
    await getWidgets(baseParams);

    const [, config] = vi.mocked(apiClient.get).mock.calls[0];
    expect(config!.params).not.toHaveProperty("filter[search]");
  });

  it("sends declared filters as filter[key]", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets: [], pagination: { total: 0 } },
    } as any);

    const getWidgets = createListAdapter<{ id: string }>("/widgets", "widgets");
    await getWidgets({
      ...baseParams,
      filters: { from_date: "2026-08-01", to_date: "2026-08-31" },
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/widgets",
      expect.objectContaining({
        params: expect.objectContaining({
          "filter[from_date]": "2026-08-01",
          "filter[to_date]": "2026-08-31",
        }),
      }),
    );
  });

  it("omits an unset filter rather than sending it empty", async () => {
    // An unknown or empty filter key is a 400 here, not a silently ignored
    // parameter — so "not set" has to mean absent from the request.
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets: [], pagination: { total: 0 } },
    } as any);

    const getWidgets = createListAdapter<{ id: string }>("/widgets", "widgets");
    await getWidgets({
      ...baseParams,
      filters: { status: "completed", from_date: null },
    });

    const [, config] = vi.mocked(apiClient.get).mock.calls[0];
    expect(config!.params).toHaveProperty("filter[status]", "completed");
    expect(config!.params).not.toHaveProperty("filter[from_date]");
  });

  it("renames a wire row through selectRow", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        widgets: [{ id: "1", wire_name: "left" }],
        pagination: { total: 1 },
      },
    } as any);

    const getWidgets = createListAdapter<
      { id: string; wire_name: string },
      { id: string; name: string }
    >("/widgets", "widgets", {
      selectRow: ({ wire_name, ...row }) => ({ ...row, name: wire_name }),
    });
    const result = await getWidgets(baseParams);

    expect(result.data).toEqual([{ id: "1", name: "left" }]);
  });

  it("keeps meta through a row mapping", async () => {
    // The two renaming fetchers used to rebuild the envelope by hand and
    // dropped `meta` doing it. Latent until one of them declares a
    // `selectMeta`, so it is asserted rather than left to be discovered.
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        widgets: [{ id: "1", wire_name: "left" }],
        total_earnings: 48250,
        pagination: { total: 1 },
      },
    } as any);

    const getWidgets = createListAdapter<
      { id: string; wire_name: string },
      { id: string; name: string },
      number
    >("/widgets", "widgets", {
      selectRow: ({ wire_name, ...row }) => ({ ...row, name: wire_name }),
      selectMeta: (body) => body.total_earnings as number,
    });
    const result = await getWidgets(baseParams);

    expect(result).toEqual({
      data: [{ id: "1", name: "left" }],
      total: 1,
      meta: 48250,
    });
  });

  it("sends a pinned filter the caller never declared", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets: [], pagination: { total: 0 } },
    } as any);

    const getWidgets = createListAdapter<{ id: string }>("/widgets", "widgets", {
      pinnedFilters: { status: "completed" },
    });
    await getWidgets({ ...baseParams, filters: { customer: "ana" } });

    const [, config] = vi.mocked(apiClient.get).mock.calls[0];
    expect(config!.params).toHaveProperty("filter[status]", "completed");
    expect(config!.params).toHaveProperty("filter[customer]", "ana");
  });

  it("throws when a key is both pinned and declared", async () => {
    // A declared key reaches the URL and the pinned one overrides it, so the
    // control renders and does nothing. Same failure as an undeclared key.
    const getWidgets = createListAdapter<{ id: string }>("/widgets", "widgets", {
      pinnedFilters: { status: "completed" },
    });

    await expect(
      getWidgets({ ...baseParams, filters: { status: null } }),
    ).rejects.toThrow(/both pinned and declared/);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("unwraps data[responseKey] and pagination.total", async () => {
    const widgets = [{ id: "1" }, { id: "2" }];
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets, pagination: { total: 42 } },
    } as any);

    const getWidgets = createListAdapter<{ id: string }>("/widgets", "widgets");
    const result = await getWidgets(baseParams);

    expect(result).toEqual({ data: widgets, total: 42 });
  });

  it("surfaces a value sitting beside the rows in the envelope", async () => {
    // `/reports/transactions` computes its period total server-side and
    // returns it as a sibling of the rows, not inside them.
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets: [{ id: "1" }], total_earnings: 48250, pagination: { total: 42 } },
    } as any);

    const getWidgets = createListAdapter<
      { id: string },
      { id: string },
      number
    >("/widgets", "widgets", {
      selectMeta: (body) => body.total_earnings as number,
    });
    const result = await getWidgets(baseParams);

    expect(result).toEqual({ data: [{ id: "1" }], total: 42, meta: 48250 });
  });

  it("leaves meta absent for an endpoint that declares no selector", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets: [], total_earnings: 48250, pagination: { total: 0 } },
    } as any);

    const getWidgets = createListAdapter<{ id: string }>("/widgets", "widgets");
    const result = await getWidgets(baseParams);

    expect(result.meta).toBeUndefined();
  });

  it("reads the response using the given responseKey", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { gizmos: [{ id: "g1" }], pagination: { total: 1 } },
    } as any);

    const getGizmos = createListAdapter<{ id: string }>("/gizmos", "gizmos");
    const result = await getGizmos(baseParams);

    expect(result).toEqual({ data: [{ id: "g1" }], total: 1 });
  });
});
