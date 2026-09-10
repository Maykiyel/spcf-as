import { Group, Select } from "@mantine/core";
import { useTableFilters } from "@/components/ui/data-table";
import { TableFilterText } from "@/components/ui/table-filter";
import { CashierFilter, DateRangeTableFilter } from "@/components/filters";
import { TRANSACTION_STATUS_LABEL } from "../lib/transaction-status";
import { TRANSACTION_STATUSES } from "../types";

/** Each control takes a value and reports a change, knowing nothing about
 * the URL or its own key; `useTableFilters` binds both. The panel is
 * exported and the transaction-specific controls are private, which is what
 * lets a second page reuse the whole set.
 */

type FilterProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

/** `customer`, not `customer_name`: the response field and the filter key
 * disagree, and this is the filter. Partial match on the wire. */
function TransactionPayerFilter(props: FilterProps) {
  return (
    <TableFilterText label="Payer Name" placeholder="Any payer" {...props} />
  );
}

/** Text, not a number input: the endpoint validates it as a string, and a
 * spinner on a receipt number invites arrowing through unrelated numbers.
 * Registered as a bare string, so it is a **partial** match, not exact. */
function TransactionSeriesNumberFilter(props: FilterProps) {
  return (
    <TableFilterText label="Series No." placeholder="Any series" {...props} />
  );
}

/** Partial match on each item's snapshotted `service_name`, so it finds a
 * transaction by a fee it contained. The Items column shows why it hit. */
function TransactionItemNameFilter(props: FilterProps) {
  return (
    <TableFilterText label="Item Name" placeholder="Any item" {...props} />
  );
}

/** A `Select`, not the segmented control the other tables use: six
 * segments beside five filters is unreadable. Not wrapped in a shared
 * `TableFilterSelect` either, since `Select` already holds `string | null`
 * and there is no bridge or debounce to factor out. Values are the wire's
 * enum, labels the map that calls `returned` "Voided". */
function TransactionStatusFilter({ value, onChange }: FilterProps) {
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

type TransactionListFiltersProps = {
  /** Whether the cashier filter belongs here. Admin-only: `filter[cashier_id]`
   * is a 400 for a cashier on `/transactions`, so `false` must mean never
   * mounted, not hidden. */
  includeCashier: boolean;
  /** Whether the status filter belongs here. `false` on the Void page,
   * where a status control would build a list of rows that can only 409.
   * Hiding it is the smaller half: the value is pinned in
   * `getVoidableTransactions`, past where the URL reaches. */
  includeStatus: boolean;
};

/**
 * How a transaction is found, in place of a search box: `/transactions`
 * accepts no `filter[search]`, and an unknown key is a 400, so a box would
 * fail the first time anyone typed in it.
 */
export function TransactionListFilters({
  includeCashier,
  includeStatus,
}: TransactionListFiltersProps) {
  const filter = useTableFilters();

  return (
    // `align="flex-end"` so labelled inputs share a baseline whatever their
    // label lengths, and wrap together.
    <Group align="flex-end" gap="md" wrap="wrap">
      <TransactionPayerFilter {...filter("customer")} />
      <TransactionSeriesNumberFilter {...filter("series_number")} />
      <TransactionItemNameFilter {...filter("item_name")} />
      {includeStatus && <TransactionStatusFilter {...filter("status")} />}
      <DateRangeTableFilter />
      {includeCashier && <CashierFilter {...filter("cashier_id")} />}
    </Group>
  );
}
