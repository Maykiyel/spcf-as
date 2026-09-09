import { describe, it, expect } from "vitest";
import {
  sortPlanViolations,
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

/**
 * Every table's columns against its endpoint's allow-list.
 *
 * Lives in `app/` because it spans features, and this is the only tier
 * allowed to see all of them: `components/ui` may not import a feature, and
 * no single feature owns the invariant.
 *
 * The point of a plan is that this is a check over static data: no jsdom, no
 * fetcher, no `ResizeObserver` stub and no header click. The page tests used
 * to be the only place a mis-declared sort key could surface, and they could
 * only cover the columns someone remembered to click.
 */
const CASES: [string, SortPlan, ColumnDef<never>[]][] = [
  [
    "GET /transactions",
    TRANSACTIONS_SORT_PLAN,
    transactionListColumns({
      includeCashier: true,
      includeStatus: true,
      actions: () => null,
    }) as ColumnDef<never>[],
  ],
  [
    "GET /reports/transactions",
    TRANSACTION_REPORT_SORT_PLAN,
    transactionReportColumns as ColumnDef<never>[],
  ],
  [
    "GET /reports/services-sold/{service}",
    SERVICE_BREAKDOWN_SORT_PLAN,
    serviceBreakdownColumns as ColumnDef<never>[],
  ],
  [
    "GET /reports/services-sold",
    SERVICES_SOLD_SORT_PLAN,
    servicesSoldColumns({ from: null, to: null }) as ColumnDef<never>[],
  ],
  [
    "GET /activity-logs",
    ACTIVITY_LOGS_SORT_PLAN,
    activityLogColumns as ColumnDef<never>[],
  ],
];

describe("sort plans match their columns", () => {
  it.each(CASES)("%s", (_endpoint, plan, columns) => {
    expect(sortPlanViolations(plan, columns)).toEqual([]);
  });

  it("covers the Void page's columns too, which drop Status", () => {
    // Same endpoint, one column lighter: dropping a sortable column can't
    // introduce a violation, but the pin is what makes them differ at all.
    expect(
      sortPlanViolations(
        TRANSACTIONS_SORT_PLAN,
        transactionListColumns({
          includeCashier: true,
          includeStatus: false,
          actions: () => null,
        }) as ColumnDef<never>[],
      ),
    ).toEqual([]);
  });
});

describe("the report allow-lists really do differ", () => {
  // Guards the reason `reportTransactionColumns` takes a plan at all. If
  // these ever converge, the parameter stops earning its place.
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

describe("the Transactions Report shows Series No. without sorting it", () => {
  // It returns the number and used to withhold the column entirely, because
  // sortability and inclusion were the same decision.
  const seriesNumber = (transactionReportColumns as ColumnDef<never>[]).find(
    (column) => column.key === "series_number",
  );

  it("renders the column", () => {
    expect(seriesNumber).toBeDefined();
  });

  it("leaves it unsortable, as the endpoint requires", () => {
    expect(seriesNumber?.sortable).toBe(false);
  });
});
