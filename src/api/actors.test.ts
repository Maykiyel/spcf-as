import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/axios/api-client";
import { getActors, type Actor } from "./actors";

// Seam: getActors' interface against a mocked apiClient.get. The request is
// the assertion: both parameters fail silently. A missing `per_page` drops
// the picker to 25 accounts, and a missing `sort` leaves its order to the
// endpoint's default — neither shows up as an error.

vi.mock("@/lib/axios/api-client", () => ({
  apiClient: { get: vi.fn() },
}));

const actors: Actor[] = [
  { id: 4, full_name: "Jaypee Pahayahay" },
  { id: 1, full_name: "Mike Bautista" },
];

describe("getActors", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { users: actors, pagination: { total: actors.length } },
    } as never);
  });

  it("asks /users for a full page of accounts, by name", async () => {
    await getActors();

    expect(apiClient.get).toHaveBeenCalledWith("/users", {
      params: { per_page: 100, sort: "full_name" },
    });
  });

  it("reads the rows out of the directory envelope", async () => {
    // `/users` is paginated and answers with `{users, pagination}`, unlike
    // `/cashiers`, which is the array itself.
    expect(await getActors()).toEqual(actors);
  });
});
