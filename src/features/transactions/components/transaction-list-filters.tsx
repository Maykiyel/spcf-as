import { Select } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { TableFilterText } from "@/components/ui/table-filter";
import { getCashiers, cashiersQueryKey } from "@/api/cashiers";
import { TRANSACTION_STATUS_LABEL } from "../lib/transaction-status";
import { TRANSACTION_STATUSES } from "../types";

/** Every control here is the shape #59 settled on: it takes a value and
 * reports a change, and knows nothing about the URL. `useServerTableState`
 * owns the values, puts them in the query key and persists them.
 *
 * They are thin on purpose. The shared tier owns what a table filter is —
 * a string or `null`, debounced where it is typed. What stays here is what
 * this feature knows and the shared tier must not: that `/transactions`
 * filters payer name under the key `customer`, that its status values are
 * the wire's own enum, and that the cashier filter takes an id.
 */

type FilterProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

/** `customer`, not `customer_name`: the response field and the filter key
 * disagree, and this is the filter. A partial match on the wire, so a
 * cashier can type what the payer told them rather than the whole name. */
export function TransactionPayerFilter(props: FilterProps) {
  return (
    <TableFilterText label="Payer Name" placeholder="Any payer" {...props} />
  );
}

/** Text rather than a number input: `filter[series_number]` is validated as
 * a string, the match is exact, and a spinner on a receipt number invites
 * arrowing through numbers that mean nothing to each other. */
export function TransactionSeriesNumberFilter(props: FilterProps) {
  return (
    <TableFilterText label="Series No." placeholder="Any series" {...props} />
  );
}

/** Matches partially against the snapshotted `service_name` on each item,
 * so it finds a transaction by a fee it contained. The Items column exists
 * so a result found this way shows why it matched. */
export function TransactionItemNameFilter(props: FilterProps) {
  return (
    <TableFilterText label="Item Name" placeholder="Any item" {...props} />
  );
}

/** A `Select` rather than the segmented control the other tables use:
 * there are five statuses plus "all", and six segments alongside five
 * other filters is a toolbar nobody can read.
 *
 * No `null` bridge needed — Mantine's `Select` already holds `string |
 * null` and `clearable` reports `null`, which is exactly what an unset
 * filter is. Values are the wire's own enum; labels come from the map that
 * calls `returned` "Voided", which is the word an admin filtering for what
 * they voided will look for. */
export function TransactionStatusFilter({ value, onChange }: FilterProps) {
  return (
    <Select
      label="Status"
      placeholder="All statuses"
      data={TRANSACTION_STATUSES.map((status) => ({
        value: status,
        label: TRANSACTION_STATUS_LABEL[status],
      }))}
      value={value}
      onChange={onChange}
      clearable
      w={{ base: "100%", xs: 160 }}
    />
  );
}

/**
 * Admin-only, and the page must mount it only for an admin rather than
 * hiding it from a cashier.
 *
 * Two independent reasons, both of which are 400s and 403s rather than
 * cosmetic: `filter[cashier_id]` isn't in a cashier's allow-list on
 * `/transactions`, and `GET /cashiers` — the query this control holds —
 * authorizes against `viewAny` on User, which a cashier fails. Holding the
 * query inside the control is what makes "not rendered" mean "never
 * requested", the same structure the Dashboard uses for its admin-only
 * sections.
 *
 * The unnarrowed cashier list, not the active-only one the series receipt
 * form asks for: a deactivated cashier's past transactions still exist,
 * and an admin looking for them is the likeliest reason to reach for this
 * filter at all.
 */
export function TransactionCashierFilter({ value, onChange }: FilterProps) {
  const cashiers = useQuery({
    queryKey: cashiersQueryKey(),
    queryFn: () => getCashiers(),
  });

  return (
    <Select
      label="Cashier"
      placeholder="All cashiers"
      data={(cashiers.data ?? []).map((cashier) => ({
        value: String(cashier.id),
        label: cashier.full_name,
      }))}
      disabled={cashiers.isLoading}
      value={value}
      onChange={onChange}
      clearable
      searchable
      w={{ base: "100%", xs: 200 }}
    />
  );
}
