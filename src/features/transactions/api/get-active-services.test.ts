import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/axios/api-client";
import { getActiveServices } from "./get-active-services";
import type { Service } from "@/api/services";

// Seam: getActiveServices' own public interface (Promise<Service[]>)
// against a mocked apiClient.get — asserting the concatenated result and
// the number of requests made, never the page-loop internals directly.

vi.mock("@/lib/axios/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

function makeServices(count: number, startId = 1): Service[] {
  return Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    name: `Service ${startId + i}`,
    price: 100,
    description: null,
    is_active: true,
  }));
}

describe("getActiveServices", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("returns every active service when the total exceeds one page", async () => {
    const page1 = makeServices(100, 1);
    const page2 = makeServices(47, 101);

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: { services: page1, pagination: { total: 147 } },
      } as any)
      .mockResolvedValueOnce({
        data: { services: page2, pagination: { total: 147 } },
      } as any);

    const result = await getActiveServices();

    expect(result).toHaveLength(147);
    expect(result).toEqual([...page1, ...page2]);
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it("stops once all pages are fetched (no over-fetching past total)", async () => {
    const page1 = makeServices(100, 1);
    const page2 = makeServices(47, 101);

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: { services: page1, pagination: { total: 147 } },
      } as any)
      .mockResolvedValueOnce({
        data: { services: page2, pagination: { total: 147 } },
      } as any);

    await getActiveServices();

    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/services", {
      params: {
        per_page: 100,
        page: 1,
        sort: "name",
        "filter[is_active]": 1,
      },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/services", {
      params: {
        per_page: 100,
        page: 2,
        sort: "name",
        "filter[is_active]": 1,
      },
    });
  });

  it("makes exactly one request when the total fits in a single page", async () => {
    const page1 = makeServices(40, 1);

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { services: page1, pagination: { total: 40 } },
    } as any);

    const result = await getActiveServices();

    expect(result).toEqual(page1);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
