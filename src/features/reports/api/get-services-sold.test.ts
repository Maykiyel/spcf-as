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
const sentSort = () => sentParams().sort;

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({
    success: true,
    message: "",
    code: 200,
    data: { services: [], pagination: { total: 0 } },
  });
});

describe("getServicesSold — the sort that reaches the wire", () => {
  it("sends the name sort alone when the user has turned sorting off", async () => {
    // `sort=none` in the URL reaches the adapter as an empty array, and an
    // unsorted grouped aggregate is the instability #65 exists to fix.
    await getServicesSold(params([]));

    expect(sentSort()).toBe("service_name");
  });

  it("appends the name tiebreaker under a revenue sort", async () => {
    // `subtotal` ties freely and several services sit at zero in any
    // period, so revenue alone does not order the rows.
    await getServicesSold(params([{ key: "subtotal", direction: "desc" }]));

    expect(sentSort()).toBe("-subtotal,service_name");
  });

  it("appends the name tiebreaker under a quantity sort", async () => {
    await getServicesSold(
      params([{ key: "total_quantity", direction: "desc" }]),
    );

    expect(sentSort()).toBe("-total_quantity,service_name");
  });

  it("does not duplicate a name sort the user already chose", async () => {
    await getServicesSold(
      params([{ key: "service_name", direction: "desc" }]),
    );

    expect(sentSort()).toBe("-service_name");
  });

  it("keeps the user's name sort first when they added a second column", async () => {
    // The tiebreaker is a floor, not a reordering: what the header shows as
    // priority 1 has to stay priority 1 on the wire.
    await getServicesSold(
      params([
        { key: "service_name", direction: "asc" },
        { key: "subtotal", direction: "desc" },
      ]),
    );

    expect(sentSort()).toBe("service_name,-subtotal");
  });
});

describe("getServicesSold — the rest of the request", () => {
  it("sends the period as filter params and asks for the services key", async () => {
    await getServicesSold(params([]));

    expect(mockGet).toHaveBeenCalledWith("/reports/services-sold", {
      params: expect.objectContaining({
        page: 1,
        per_page: 25,
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
