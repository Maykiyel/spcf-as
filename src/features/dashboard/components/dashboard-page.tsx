import { Stack, Title } from "@mantine/core";
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
 * The branch itself arrives with the first admin-only section rather than
 * as an empty `role === "admin" &&` waiting for one. What makes the
 * structure extensible is where the queries live, not a conditional with
 * nothing on one side of it.
 */
export function DashboardPage() {
  return (
    <Stack gap="lg">
      <Title order={3}>Dashboard</Title>

      <TodayFigures />
    </Stack>
  );
}
