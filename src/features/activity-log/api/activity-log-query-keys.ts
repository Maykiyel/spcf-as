// In its own module because the page test stubs both fetchers with a bare
// `vi.mock`, and automock empties exported arrays. A key living in a mocked
// module is `[]` under test, and an empty key matches every query.

export const ACTIVITY_LOGS_QUERY_KEY = ["activity-logs"] as const;

/** `useServerTableState` appends page, size, sorts and filters, so the
 * list key stays a prefix and this one sits under it. */
export const activityLogDetailQueryKey = (id: number) =>
  [...ACTIVITY_LOGS_QUERY_KEY, id] as const;
