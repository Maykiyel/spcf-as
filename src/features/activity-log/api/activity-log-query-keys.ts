// Its own module because automock empties exported arrays: a key in a
// `vi.mock`ed module is `[]` under test, and `[]` matches every query.

export const ACTIVITY_LOGS_QUERY_KEY = ["activity-logs"] as const;

/** `useServerTableState` appends page, size, sorts and filters, so the
 * list key stays a prefix and this sits under it. */
export const activityLogDetailQueryKey = (id: number) =>
  [...ACTIVITY_LOGS_QUERY_KEY, id] as const;
