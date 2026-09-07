import { Stack, Title } from "@mantine/core";
import { useAuthStore } from "@/stores/auth-store";
import { CashierEarningsTable } from "./cashier-earnings-table";
import { MonthlyEarningsSection } from "./monthly-earnings-section";
import { TodayFigures } from "./today-figures";

/**
 * The page everyone lands on after signing in.
 *
 * The role branch is forced by the API: the earnings endpoints are
 * admin-only and 403 a cashier, so a cashier's dashboard must not request
 * them at all. Each admin-only section holds its own query, so unmounted
 * it never fires.
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

      {isAdmin && (
        <>
          <MonthlyEarningsSection />
          <CashierEarningsTable />
        </>
      )}
    </Stack>
  );
}
