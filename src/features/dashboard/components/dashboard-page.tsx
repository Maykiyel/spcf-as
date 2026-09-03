import { Stack, Title } from "@mantine/core";
import { useAuthStore } from "@/stores/auth-store";
import { CashierEarningsTable } from "./cashier-earnings-table";
import { MonthlyEarningsSection } from "./monthly-earnings-section";
import { TodayFigures } from "./today-figures";

/**
 * The page everyone lands on after signing in.
 *
 * **The role branch is forced by the API, not chosen for design reasons.**
 * `GET /dashboard` scopes itself and serves both roles, but the monthly
 * earnings and cashier earnings endpoints are admin-only and answer a
 * cashier with a 403. A cashier's dashboard therefore must not request
 * them at all — not request-and-ignore, not render-and-hide. That is why
 * each admin-only section is its own component holding its own query:
 * unmounted, it never fires.
 *
 * The branch reads the role from the auth store rather than from the
 * route, because `/dashboard` is a page both roles reach — `pages.ts`
 * gives it no `roles`, and it should stay that way.
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
