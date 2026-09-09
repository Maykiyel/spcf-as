// Its own module because automock empties exported arrays: a key in a
// `vi.mock`ed module is `[]` under test, and `[]` matches every query.

export const TRANSACTION_REPORT_QUERY_KEY = ["reports", "transactions"] as const;

export const SERVICES_SOLD_QUERY_KEY = ["reports", "services-sold"] as const;

export const SERVICE_BREAKDOWN_QUERY_KEY = [
  "reports",
  "service-breakdown",
] as const;

/** Under the catalog's own prefix, so invalidating `["services"]` after an
 * edit also drops the name the drill-down heading is showing. */
export const serviceDetailQueryKey = (serviceId: number) =>
  ["services", "detail", serviceId] as const;
