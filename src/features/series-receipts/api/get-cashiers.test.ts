import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/axios/api-client";
import { getCashiers } from "./get-cashiers";
import type { Cashier } from "../types";

// Seam: getCashiers' own interface against a mocked apiClient.get. The
// request is the assertion here, not an incidental detail: dropping the
// `is_active` parameter fails nothing visible — the picker simply offers
// cashiers the server will refuse, and the only symptom is a 403 the
// admin meets after choosing one. Same seam as get-active-services.test.ts.

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

  it("asks /cashiers for active cashiers only", async () => {
    await getCashiers();

    expect(apiClient.get).toHaveBeenCalledWith("/cashiers", {
      params: { is_active: 1 },
    });
  });

  it("returns the list unwrapped", async () => {
    // `/cashiers` is unpaginated and answers with the array itself, unlike
    // every list endpoint behind `{<key>: [...], pagination}`.
    expect(await getCashiers()).toEqual(cashiers);
  });
});
