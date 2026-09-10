import { Stack, Title } from "@mantine/core";
import { useAuthStore } from "@/stores/auth-store";
import { RecentTransactionsTable } from "@/features/transactions/components/recent-transactions-table";
import { CashierEarningsTable } from "./cashier-earnings-table";
import { MonthlyEarningsSection } from "./monthly-earnings-section";
import { TodayFigures } from "./today-figures";

/**
 * The page everyone lands on after signing in.
 *
 * The admin half of the role branch is forced by the API: the earnings
 * endpoints are admin-only and 403 a cashier, so a cashier's dashboard
 * must not request them at all. Every section holds its own query, so
 * unmounted it never fires.
 *
 * The cashier half is a choice, not a 403. See CONTEXT.md.
 *
 * Reads the role from the auth store, not the route: `/dashboard` is a
 * page both roles reach and should stay that way.
 */
export function DashboardPage() {
  const isAdmin = useAuthStore((state) => state.user?.role) === "admin";

  return (
    <Stack gap="lg">
      <Title order={3}>Dashboard</Title>

      <TodayFigures />

      {isAdmin ? (
        <>
          <MonthlyEarningsSection />
          <CashierEarningsTable />
        </>
      ) : (
        <RecentTransactionsTable />
      )}
    </Stack>
  );
}
