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
        "filter[search]": undefined,
      },
    });
  });

  it("forwards params.search as filter[search]", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets: [], pagination: { total: 0 } },
    } as any);

    const getWidgets = createListAdapter<{ id: string }>("/widgets", "widgets");
    await getWidgets({ ...baseParams, search: "gadget" });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/widgets",
      expect.objectContaining({
        params: expect.objectContaining({ "filter[search]": "gadget" }),
      }),
    );
  });

  it("merges extra params on top of the standard ones", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { widgets: [], pagination: { total: 0 } },
    } as any);

    const getWidgets = createListAdapter<{ id: string }>("/widgets", "widgets");
    await getWidgets(baseParams, { "filter[is_active]": 1 });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/widgets",
      expect.objectContaining({
        params: expect.objectContaining({ "filter[is_active]": 1 }),
      }),
    );
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

  it("reads the response using the given responseKey", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { gizmos: [{ id: "g1" }], pagination: { total: 1 } },
    } as any);

    const getGizmos = createListAdapter<{ id: string }>("/gizmos", "gizmos");
    const result = await getGizmos(baseParams);

    expect(result).toEqual({ data: [{ id: "g1" }], total: 1 });
  });
});
