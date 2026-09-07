import { Group, Select } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import type { TableFilters } from "@/components/ui/data-table";
import { DateRangeFilter, toApiDate } from "@/components/ui/date-range";
import { TableFilterText } from "@/components/ui/table-filter";
import { getCashiers, cashiersQueryKey } from "@/api/cashiers";
import { TRANSACTION_STATUS_LABEL } from "../lib/transaction-status";
import { TRANSACTION_STATUSES } from "../types";

/** Each control takes a value and reports a change, knowing nothing about
 * the URL; `useServerTableState` owns the values. The controls are private
 * and the panel is exported, which is what lets a second page reuse the
 * whole set rather than re-wiring six `setFilters` calls.
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

/**
 * Admin-only, and must be *unmounted* for a cashier rather than hidden:
 * `filter[cashier_id]` is a 400 for them and `GET /cashiers` a 403. Holding
 * the query inside the control is what makes "not rendered" mean "never
 * requested".
 *
 * Asks for every cashier, not the active-only list: a deactivated
 * cashier's past transactions are the likeliest reason to use this.
 */
function TransactionCashierFilter({ value, onChange }: FilterProps) {
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

type TransactionListFiltersProps = {
  /** The table's current filter values, straight off `useServerTableState`. */
  filters: TableFilters;
  /** `setFilters`. A patch, because the date range moves both ends at once
   * and two writes would mean two refetches for one action. */
  onChange: (patch: TableFilters) => void;
  /** Whether the cashier filter belongs here. The caller decides, since the
   * reason differs by page. `false` must mean never mounted, not hidden. */
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
  filters,
  onChange,
  includeCashier,
  includeStatus,
}: TransactionListFiltersProps) {
  return (
    // `align="flex-end"` so labelled inputs share a baseline whatever their
    // label lengths, and wrap together.
    <Group align="flex-end" gap="md" wrap="wrap">
      <TransactionPayerFilter
        value={filters.customer}
        onChange={(customer) => onChange({ customer })}
      />
      <TransactionSeriesNumberFilter
        value={filters.series_number}
        onChange={(series_number) => onChange({ series_number })}
      />
      <TransactionItemNameFilter
        value={filters.item_name}
        onChange={(item_name) => onChange({ item_name })}
      />
      {includeStatus && (
        <TransactionStatusFilter
          value={filters.status}
          onChange={(status) => onChange({ status })}
        />
      )}
      {/* `toApiDate`, not a cast: the values are strings off the URL, and
          this is what decides whether one is a date the API takes. */}
      <DateRangeFilter
        label="Date Range"
        value={{
          from: toApiDate(filters.from_date),
          to: toApiDate(filters.to_date),
        }}
        onChange={(range) =>
          onChange({ from_date: range.from, to_date: range.to })
        }
      />
      {includeCashier && (
        <TransactionCashierFilter
          value={filters.cashier_id}
          onChange={(cashier_id) => onChange({ cashier_id })}
        />
      )}
    </Group>
  );
}
