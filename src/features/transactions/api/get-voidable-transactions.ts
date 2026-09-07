import type { ServerTableParams } from "@/components/ui/data-table";
import { getTransactions } from "./get-transactions";

/** The Void page's own cache prefix, under the shared `transactions`
 * namespace.
 *
 * Under it rather than beside it so one `invalidateQueries` on
 * `TRANSACTIONS_QUERY_KEY` still reaches this list, the receipts list and a
 * transaction's detail entry alike — which is what a void needs, and what
 * it would lose if this list were keyed on something else.
 *
 * Distinct from `TRANSACTIONS_QUERY_KEY` rather than sharing it, because
 * the two lists ask `/transactions` different questions. Their filter bags
 * differ by a `status` key, so their keys would already differ in practice,
 * but only by accident of what each page declares. This says it. */
export const VOIDABLE_TRANSACTIONS_QUERY_KEY = [
  "transactions",
  "voidable",
] as const;

/** The status a transaction has to be in for `POST /void` to succeed.
 * Every other status answers that call with a 409 (see
 * `TransactionAction::isAllowedFor`), which is why this page shows nothing
 * else: an admin should never be offered an action that cannot work. */
const VOIDABLE_STATUS = "completed";

/**
 * One page of the transactions an admin may void.
 *
 * `getTransactions` with `filter[status]` pinned, rather than the Void page
 * declaring a `status` filter that happens to default to `completed`.
 *
 * **The difference is a hand-edited URL.** `useTableControls` reads every
 * *declared* filter out of the query string and falls back to the declared
 * default only when the param is absent, so a declared `status` would be
 * overridable with `?void_status=pending` and the page would render a list
 * where every row's Void button 409s. Pinning it here puts the value past
 * the last point the URL can reach.
 *
 * It is pinned here and not through `createListAdapter`'s `extra` on
 * purpose: `extra` is documented as the answer for a parameter that isn't a
 * `filter[...]`, and this one is.
 *
 * The pin is applied over the caller's filters rather than under them, so
 * it wins outright. Nothing on the page sets `status`, and this is what
 * keeps that true if something later does.
 */
export const getVoidableTransactions = (params: ServerTableParams) =>
  getTransactions({
    ...params,
    filters: { ...params.filters, status: VOIDABLE_STATUS },
  });
