import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/axios/api-client";
import { getCashiers, cashiersQueryKey, type Cashier } from "./cashiers";

// Seam: getCashiers' interface against a mocked apiClient.get. The
// request is the assertion: dropping `is_active` fails nothing visible,
// and only shows up as a 403 after an admin picks an inactive cashier.
//
// The two callers want opposite answers, so both the parameter and the
// cache key have to tell them apart.

vi.mock("@/lib/axios/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

const cashiers: Cashier[] = [
  { id: 1, full_name: "Jaypee Pahayahay" },
  { id: 2, full_name: "Noli Cruz" },
];

describe("getCashiers", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.get).mockResolvedValue({ data: cashiers } as never);
  });

  it("asks /cashiers for active cashiers only when told to narrow", async () => {
    await getCashiers({ activeOnly: true });

    expect(apiClient.get).toHaveBeenCalledWith("/cashiers", {
      params: { is_active: 1 },
    });
  });

  it("sends no is_active at all for the unnarrowed list", async () => {
    // The endpoint branches on the parameter being present, not on its
    // value — `is_active: 0` would ask for inactive cashiers only, which
    // is the opposite of what an unnarrowed list means.
    await getCashiers();

    expect(apiClient.get).toHaveBeenCalledWith("/cashiers", { params: {} });
  });

  it("returns the list unwrapped", async () => {
    // `/cashiers` is unpaginated and answers with the array itself, unlike
    // every list endpoint behind `{<key>: [...], pagination}`.
    expect(await getCashiers()).toEqual(cashiers);
  });
});

describe("cashiersQueryKey", () => {
  it("keys the two variants apart", () => {
    // One key would let whichever page mounted first serve its rows to the
    // other, and the active-only answer reaching the transactions filter
    // is silent: it just offers fewer cashiers than exist.
    expect(cashiersQueryKey({ activeOnly: true })).not.toEqual(
      cashiersQueryKey(),
    );
  });
});
