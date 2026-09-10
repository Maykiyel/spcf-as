import { describe, it, expect } from "vitest";
import {
  sortableColumnIds,
  unreachableSortKeys,
  type ColumnDef,
  type SortPlan,
} from "@/components/ui/data-table";

import { TRANSACTIONS_SORT_PLAN } from "@/features/transactions/api/get-transactions";
import { transactionListColumns } from "@/features/transactions/components/transaction-list-columns";
import { TRANSACTION_REPORT_SORT_PLAN } from "@/features/reports/api/get-transaction-report";
import { transactionReportColumns } from "@/features/reports/components/transaction-report-columns";
import { SERVICE_BREAKDOWN_SORT_PLAN } from "@/features/reports/api/get-service-breakdown";
import { serviceBreakdownColumns } from "@/features/reports/components/service-breakdown-columns";
import { SERVICES_SOLD_SORT_PLAN } from "@/features/reports/api/get-services-sold";
import { servicesSoldColumns } from "@/features/reports/components/services-sold-columns";
import { ACTIVITY_LOGS_SORT_PLAN } from "@/features/activity-log/api/get-activity-logs";
import { activityLogColumns } from "@/features/activity-log/components/activity-log-columns";
import { USER_ACCOUNTS_SORT_PLAN } from "@/features/accounts/api/get-user-accounts";
import { userAccountColumns } from "@/features/accounts/components/user-account-columns";
import { CASHIER_EARNINGS_SORT_PLAN } from "@/features/dashboard/api/get-cashier-earnings";
import { cashierEarningsColumns } from "@/features/dashboard/components/cashier-earnings-columns";
import { SERVICES_SORT_PLAN } from "@/features/services/api/get-services";
import { serviceColumns } from "@/features/services/components/service-columns";
import { ITEM_CODES_SORT_PLAN } from "@/features/item-codes/api/get-item-codes";
import { itemCodeColumns } from "@/features/item-codes/components/item-code-columns";
import { SERIES_RECEIPTS_SORT_PLAN } from "@/features/series-receipts/api/get-series-receipts";
import { seriesReceiptColumns } from "@/features/series-receipts/components/series-receipt-columns";

/**
 * What every table offers a sort on, named outright.
 *
 * Sortability is derived from the endpoint's plan, so "a sortable column
 * names an allow-listed key" is now true by construction and worth nothing
 * as a test. The risk moved rather than went away: the plan alone decides,
 * so a key wrongly added to `allowed` silently lights up a header. These
 * lists are what still fails when either side changes by accident.
 *
 * `unreachable` is the other half: keys the endpoint allows and this table
 * offers no header for. Not a defect, and not always empty — `/users`
 * allows `first_name` and `last_name` in a directory that shows neither —
 * so it is named rather than required to be empty.
 *
 * Lives in `app/` because it spans features, and this is the only tier
 * allowed to see all of them: `components/ui` may not import a feature, and
 * no single feature owns the invariant.
 */
type Case = {
  endpoint: string;
  plan: SortPlan;
  columns: ColumnDef<never>[];
  sortable: string[];
  unreachable: string[];
};

const CASES: Case[] = [
  {
    endpoint: "GET /transactions",
    plan: TRANSACTIONS_SORT_PLAN,
    columns: transactionListColumns({
      includeCashier: true,
      includeStatus: true,
      includeItems: true,
      actions: () => null,
    }) as ColumnDef<never>[],
    // Not Control ID, Cashier, Items or Total: the endpoint allow-lists none
    // of them, and Actions has no field at all.
    sortable: ["date", "series_number", "customer_name", "status"],
    unreachable: [],
  },
  {
    endpoint: "GET /reports/transactions",
    plan: TRANSACTION_REPORT_SORT_PLAN,
    columns: transactionReportColumns as ColumnDef<never>[],
    // Series No. is shown and not sortable: this endpoint returns the
    // number and will not order by it.
    sortable: [
      "date",
      "control_id",
      "customer_name",
      "cashier",
      "total",
      "amount_paid",
      "change_amount",
    ],
    unreachable: [],
  },
  {
    endpoint: "GET /reports/services-sold/{service}",
    plan: SERVICE_BREAKDOWN_SORT_PLAN,
    columns: serviceBreakdownColumns as ColumnDef<never>[],
    // The mirror image: series sorts here, and there are no amounts to sort.
    sortable: [
      "date",
      "control_id",
      "series_number",
      "customer_name",
      "cashier",
      "total",
    ],
    unreachable: [],
  },
  {
    endpoint: "GET /reports/services-sold",
    plan: SERVICES_SOLD_SORT_PLAN,
    columns: servicesSoldColumns({
      from: null,
      to: null,
    }) as ColumnDef<never>[],
    sortable: ["service", "total_quantity", "subtotal"],
    unreachable: [],
  },
  {
    endpoint: "GET /activity-logs",
    plan: ACTIVITY_LOGS_SORT_PLAN,
    columns: activityLogColumns as ColumnDef<never>[],
    // `created_at` is the endpoint's only allow-listed sort, so When is the
    // only header that may carry a caret.
    sortable: ["created_at"],
    unreachable: [],
  },
  {
    endpoint: "GET /users",
    plan: USER_ACCOUNTS_SORT_PLAN,
    columns: userAccountColumns as ColumnDef<never>[],
    // Role, Status and Actions are shown and not sortable: `/users`
    // allow-lists none of them.
    sortable: ["full_name", "username"],
    // The only non-empty one. `/users` orders by either half of a name and
    // the directory shows the whole name in one column, so both are named
    // rather than treated as a defect.
    unreachable: ["first_name", "last_name"],
  },
  {
    endpoint: "GET /reports/cashier-earnings",
    plan: CASHIER_EARNINGS_SORT_PLAN,
    columns: cashierEarningsColumns as ColumnDef<never>[],
    sortable: ["cashier_name", "total_earnings"],
    unreachable: [],
  },
  {
    endpoint: "GET /services",
    plan: SERVICES_SORT_PLAN,
    columns: serviceColumns({ onEdit: () => {} }) as ColumnDef<never>[],
    // Description is shown and not sortable, unlike the item code catalog
    // below: `/services` allow-lists `description` on neither.
    sortable: ["item_code", "name", "price"],
    unreachable: [],
  },
  {
    endpoint: "GET /item-codes",
    plan: ITEM_CODES_SORT_PLAN,
    columns: itemCodeColumns({ onEdit: () => {} }) as ColumnDef<never>[],
    // Description sorts: the gap `68594fb` closed, and what this case guards.
    sortable: ["name", "description"],
    unreachable: [],
  },
  {
    endpoint: "GET /series-receipts",
    plan: SERIES_RECEIPTS_SORT_PLAN,
    columns: seriesReceiptColumns as ColumnDef<never>[],
    // `cashier` is the column's identity and `account` is the wire's word
    // for it, reached through `sortKey`. That is why `account` is not
    // unreachable despite no column being named for it.
    sortable: ["cashier", "from", "to", "remaining_sheets"],
    unreachable: [],
  },
];

describe("what each table offers a sort on", () => {
  it.each(CASES)("$endpoint", ({ plan, columns, sortable }) => {
    expect(sortableColumnIds(plan, columns)).toEqual(sortable);
  });

  it.each(CASES)("$endpoint — allow-listed but unreachable", ({
    plan,
    columns,
    unreachable,
  }) => {
    expect(unreachableSortKeys(plan, columns)).toEqual(unreachable);
  });

  it("drops Status with the column, on the Void page", () => {
    // Same endpoint, one column lighter, because every row there is already
    // pinned to `completed`.
    const columns = transactionListColumns({
      includeCashier: true,
      includeStatus: false,
      includeItems: true,
      actions: () => null,
    }) as ColumnDef<never>[];

    expect(sortableColumnIds(TRANSACTIONS_SORT_PLAN, columns)).toEqual([
      "date",
      "series_number",
      "customer_name",
    ]);
    expect(unreachableSortKeys(TRANSACTIONS_SORT_PLAN, columns)).toEqual([
      "status",
    ]);
  });

  it("keeps all four sorts on the dashboard's Recent Transactions", () => {
    // Two columns lighter than the receipts list, and neither of them was
    // sortable — so trimming for a dashboard-width table costs no header.
    const columns = transactionListColumns({
      includeCashier: false,
      includeStatus: true,
      includeItems: false,
    }) as ColumnDef<never>[];

    expect(sortableColumnIds(TRANSACTIONS_SORT_PLAN, columns)).toEqual([
      "date",
      "series_number",
      "customer_name",
      "status",
    ]);
    expect(unreachableSortKeys(TRANSACTIONS_SORT_PLAN, columns)).toEqual([]);
  });
});

describe("the report allow-lists really do differ", () => {
  // Guards the reason the two reports keep separate plans over one shared
  // columns builder. If these ever converge, the split stops earning itself.
  it("allows series_number on the breakdown and not on the report", () => {
    expect(SERVICE_BREAKDOWN_SORT_PLAN.allowed).toContain("series_number");
    expect(TRANSACTION_REPORT_SORT_PLAN.allowed).not.toContain("series_number");
  });

  it("allows the two amount sorts on the report and not on the breakdown", () => {
    expect(TRANSACTION_REPORT_SORT_PLAN.allowed).toContain("amount_paid");
    expect(SERVICE_BREAKDOWN_SORT_PLAN.allowed).not.toContain("amount_paid");
  });

  it("names the payer sort differently from the transactions list", () => {
    expect(TRANSACTIONS_SORT_PLAN.allowed).toContain("customer");
    expect(TRANSACTION_REPORT_SORT_PLAN.allowed).toContain("customer_name");
  });
});
