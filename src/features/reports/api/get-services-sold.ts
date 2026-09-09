import {
  createListAdapter,
  type ServerTableParams,
  type SortEntry,
} from "@/components/ui/data-table";
import type { ServiceSoldRow } from "../types";

/** The only key this endpoint sorts by that is unique, so the only one that
 * is a total order. `subtotal` and `total_quantity` both tie freely. */
const NAME_SORT: SortEntry = { key: "service_name", direction: "asc" };

/** Appended rather than only declared: the endpoint has no `defaultSort`,
 * so every sort the user can reach needs a tiebreaker or the same row can
 * appear on two pages and another on none. See #65. */
const withNameTiebreaker = (sorts: SortEntry[]): SortEntry[] =>
  sorts.some((sort) => sort.key === NAME_SORT.key)
    ? sorts
    : [...sorts, NAME_SORT];

const fetchServicesSold = createListAdapter<ServiceSoldRow>(
  "/reports/services-sold",
  "services",
);

/** One page of `GET /reports/services-sold`. No `supportsSearch`: an
 * unknown filter key here is a 400. */
export const getServicesSold = (params: ServerTableParams) =>
  fetchServicesSold({ ...params, sorts: withNameTiebreaker(params.sorts) });
