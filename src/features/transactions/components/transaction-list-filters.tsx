import { Group, Select } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import type { TableFilters } from "@/components/ui/data-table";
import { DateRangeFilter, toApiDate } from "@/components/ui/date-range";
import { TableFilterText } from "@/components/ui/table-filter";
import { getCashiers, cashiersQueryKey } from "@/api/cashiers";
import { TRANSACTION_STATUS_LABEL } from "../lib/transaction-status";
import { TRANSACTION_STATUSES } from "../types";

/** Every control here is the shape #59 settled on: it takes a value and
 * reports a change, and knows nothing about the URL. `useServerTableState`
 * owns the values, puts them in the query key and persists them.
 *
 * The controls are private to this file and the panel is what's exported.
 * The panel is one component whether it holds three of them or seven —
 * which is what lets the Void page reuse the finding half of this page
 * without re-listing six controls and re-wiring six `setFilters` calls.
 */

type FilterProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

/** `customer`, not `customer_name`: the response field and the filter key
 * disagree, and this is the filter. A partial match on the wire, so a
 * cashier can type what the payer told them rather than the whole name. */
function TransactionPayerFilter(props: FilterProps) {
  return (
    <TableFilterText label="Payer Name" placeholder="Any payer" {...props} />
  );
}

/** Text rather than a number input: `filter[series_number]` is validated as
 * a string, and a spinner on a receipt number invites arrowing through
 * numbers that mean nothing to each other.
 *
 * It is registered on the endpoint as a bare string, which spatie turns
 * into a **partial** match — the same as payer and item name, not an exact
 * lookup. So typing part of a number narrows rather than finding nothing. */
function TransactionSeriesNumberFilter(props: FilterProps) {
  return (
    <TableFilterText label="Series No." placeholder="Any series" {...props} />
  );
}

/** Matches partially against the snapshotted `service_name` on each item,
 * so it finds a transaction by a fee it contained. The Items column exists
 * so a result found this way shows why it matched. */
function TransactionItemNameFilter(props: FilterProps) {
  return (
    <TableFilterText label="Item Name" placeholder="Any item" {...props} />
  );
}

/** A `Select` rather than the segmented control the other tables use:
 * there are five statuses plus "all", and six segments alongside five
 * other filters is a panel nobody can read.
 *
 * Composed from Mantine's `Select` directly rather than through a shared
 * `TableFilterSelect`. There is nothing for one to own: `Select` already
 * holds `string | null` and `clearable` already reports `null`, so unlike
 * `TableFilterSegments` and `TableFilterText` there is no bridge and no
 * debounce to factor out — a wrapper would forward six props and add a
 * name. See the note in the shared tier's README.
 *
 * Values are the wire's own enum; labels come from the map that calls
 * `returned` "Voided", which is the word an admin filtering for what they
 * voided will look for. */
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
 * Admin-only, and the panel must mount it only for an admin rather than
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
  /** `setFilters`. A patch rather than a single key/value, because the date
   * range moves both of its ends at once and two sequential writes would
   * mean two refetches for one user action. */
  onChange: (patch: TableFilters) => void;
  /** Whether the cashier filter belongs on this panel.
   *
   * The caller decides, because the reason differs by page: the receipts
   * list gates it on the signed-in role, and the Void page is admin-only
   * outright. What must not vary is that a `false` here means the control
   * is never mounted — see `TransactionCashierFilter`. */
  includeCashier: boolean;
};

/**
 * How a transaction is found on this page, in place of a search box.
 *
 * `/transactions` accepts no `filter[search]`, and an unknown filter key is
 * a 400 here rather than an ignored parameter — so a box would fail the
 * first time anyone typed into it. These filters are the finding tool
 * instead, and between payer name, series number and item name they cover
 * the job better than one box over one column would.
 */
export function TransactionListFilters({
  filters,
  onChange,
  includeCashier,
}: TransactionListFiltersProps) {
  return (
    // `align="flex-end"` so the labelled inputs sit on one baseline
    // whatever their label lengths, and wrap onto a second row together.
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
      <TransactionStatusFilter
        value={filters.status}
        onChange={(status) => onChange({ status })}
      />
      {/* `toApiDate` on the way in rather than a cast: the values are
          strings off the URL, and this is the one function that decides
          whether a string is a date the API will take. */}
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
