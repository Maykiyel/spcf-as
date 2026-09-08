// Its own module because automock empties exported arrays: a key in a
// `vi.mock`ed module is `[]` under test, and `[]` matches every query.

export const TRANSACTION_REPORT_QUERY_KEY = ["reports", "transactions"] as const;
