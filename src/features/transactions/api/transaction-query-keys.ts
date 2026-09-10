// Every cache key this feature uses, derived from one prefix so a single
// `invalidateQueries` on it reaches both lists and a transaction's detail
// entry. A void depends on that.
//
// In their own module because both page tests stub their list fetcher with
// a bare `vi.mock`, and automock empties exported arrays. A key living in a
// mocked module is `[]` under test, and an empty key matches every query,
// so an invalidation assertion would pass whatever the real key said.

export const TRANSACTIONS_QUERY_KEY = ["transactions"] as const;

/** `useServerTableState` appends page, size, sorts and filters, so this
 * stays a prefix. Distinct from the receipts list because the two pages ask
 * `/transactions` different questions. */
export const VOIDABLE_TRANSACTIONS_QUERY_KEY = [
  ...TRANSACTIONS_QUERY_KEY,
  "voidable",
] as const;

/** A number here, a string in the Void list's key, so the two can never
 * collide under the shared prefix. */
export const transactionDetailQueryKey = (controlId: number) =>
  [...TRANSACTIONS_QUERY_KEY, controlId] as const;

/** Distinct from the receipts list for the same reason the Void list is:
 * the dashboard section asks `/transactions` a different question, with a
 * page size of its own and no filters at all. */
export const RECENT_TRANSACTIONS_QUERY_KEY = [
  ...TRANSACTIONS_QUERY_KEY,
  "recent",
] as const;
