/**
 * Every cache key this feature uses, and the relationship between them.
 *
 * The three are here together because that relationship is load-bearing
 * and was previously only prose. A void invalidates the shared prefix and
 * expects it to reach all three: this page's list, the receipts list, and
 * the transaction's own detail entry. Derived rather than restated, so the
 * invariant is a fact about the code instead of a claim in a comment that
 * nothing checks.
 *
 * **In their own module rather than beside a fetcher**, for a reason worth
 * recording: both page tests stub their list fetcher with a bare
 * `vi.mock`, vitest's automock replaces every export of a mocked module,
 * and it **empties exported arrays**. A key living in a mocked module is
 * `[]` under test, and `invalidateQueries({ queryKey: [] })` matches every
 * query in the cache — so a test asserting an invalidation reached
 * something would pass whatever the real key said. Nothing mocks this
 * module, so the keys a test sees are the keys production uses.
 */

/** The prefix every transaction cache entry starts with, and the one a
 * mutation invalidates to reach all of them. `useServerTableState` appends
 * the page, size, sorts and filters to a list key, so it is a prefix
 * rather than a whole key, which is what `invalidateQueries` matches on. */
export const TRANSACTIONS_QUERY_KEY = ["transactions"] as const;

/** The Void page's list, under the shared prefix rather than beside it, so
 * one invalidation still reaches it.
 *
 * Distinct from the receipts list's key because the two pages ask
 * `/transactions` different questions. Their filter bags already differ by
 * a `status` key, so in practice their keys would differ anyway, but only
 * by accident of what each page declares. This says it. */
export const VOIDABLE_TRANSACTIONS_QUERY_KEY = [
  ...TRANSACTIONS_QUERY_KEY,
  "voidable",
] as const;

/** One transaction's detail entry.
 *
 * The `controlId` is a number and the Void list's discriminator is a
 * string, so the two can never collide under the shared prefix. */
export const transactionDetailQueryKey = (controlId: number) =>
  [...TRANSACTIONS_QUERY_KEY, controlId] as const;
