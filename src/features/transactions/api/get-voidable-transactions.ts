import type { ServerTableParams } from "@/components/ui/data-table";
import { getTransactions } from "./get-transactions";

/** The only status `POST /void` accepts; every other one is a 409. */
const VOIDABLE_STATUS = "completed";

/**
 * One page of the transactions an admin may void.
 *
 * Pinned here rather than declared as a filter defaulting to `completed`:
 * `useTableControls` reads declared filters out of the URL, so
 * `?void_status=pending` would fill the page with rows whose Void button
 * can only 409. This is past the last point the URL reaches.
 *
 * Not through `createListAdapter`'s `extra`, which is for a parameter that
 * isn't a `filter[...]`. Applied over the caller's filters, so it wins.
 */
export const getVoidableTransactions = (params: ServerTableParams) =>
  getTransactions({
    ...params,
    filters: { ...params.filters, status: VOIDABLE_STATUS },
  });
