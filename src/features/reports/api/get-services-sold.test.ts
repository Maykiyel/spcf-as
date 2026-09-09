import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/axios/api-client";
import type { ServerTableParams, SortEntry } from "@/components/ui/data-table";
import { getServicesSold } from "./get-services-sold";

vi.mock("@/lib/axios/api-client");
const mockGet = vi.mocked(apiClient.get);

const params = (sorts: SortEntry[]): ServerTableParams => ({
  page: 1,
  per_page: 25,
  sorts,
  filters: { from_date: "2026-09-01", to_date: "2026-09-30" },
});

const sentParams = () => mockGet.mock.calls.at(-1)![1]!.params;

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({
    success: true,
    message: "",
    code: 200,
    data: { services: [], pagination: { total: 0 } },
  });
});

describe("getServicesSold", () => {
  it("sends the sort the table asked for, and nothing else", async () => {
    // The endpoint appends its own `service_id` tiebreaker as of backend
    // `0428e2c`, so the client no longer adds one.
    await getServicesSold(params([{ key: "subtotal", direction: "desc" }]));

    expect(sentParams().sort).toBe("-subtotal");
  });

  it("sends no sort at all when the user has turned sorting off", async () => {
    await getServicesSold(params([]));

    expect(sentParams().sort).toBeUndefined();
  });

  it("sends the period as filter params and asks for the services key", async () => {
    await getServicesSold(params([{ key: "service_name", direction: "asc" }]));

    expect(mockGet).toHaveBeenCalledWith("/reports/services-sold", {
      params: expect.objectContaining({
        page: 1,
        per_page: 25,
        sort: "service_name",
        "filter[from_date]": "2026-09-01",
        "filter[to_date]": "2026-09-30",
      }),
    });
  });

  it("sends no search filter, because the endpoint allow-lists none", async () => {
    // An unknown `filter[]` key is a 400 here, not an ignored parameter.
    await getServicesSold({ ...params([]), search: "guidance" });

    expect(sentParams()["filter[search]"]).toBeUndefined();
  });
});
