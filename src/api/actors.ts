import { apiClient } from "@/lib/axios/api-client";

// Who an activity entry can name, for the Activity Log's Performed By
// picker. Mirrors `cashiers.ts`; see CONTEXT.md's `src/api/` entry.
export type Actor = {
  id: number;
  full_name: string;
};

export const actorsQueryKey = () => ["actors"] as const;

/** The endpoint's `max_per_page`. Past it a name goes missing from the
 * picker. */
const MAX_PAGE_SIZE = 100;

/** Every account on record, flat. **Admin only** (`viewAny` on User), so a
 * caller has to be a component a cashier never mounts, not one whose result
 * is hidden. Distinct from `getUserAccounts`, the directory table's. */
export const getActors = async (): Promise<Actor[]> => {
  const response = await apiClient.get<{ users: Actor[] }>("/users", {
    // `full_name` is the endpoint's own default too, sent explicitly.
    params: { per_page: MAX_PAGE_SIZE, sort: "full_name" },
  });
  return response.data.users;
};
