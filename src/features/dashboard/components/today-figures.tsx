import { SimpleGrid, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/utils/currency";
import {
  DASHBOARD_TODAY_QUERY_KEY,
  getDashboardToday,
} from "../api/get-dashboard-today";
import { StatTile } from "./stat-tile";

/** The two figures every user sees, scoped to them by the endpoint.
 *
 * Owns its own request, loading and error state, so a failure here leaves
 * the admin's chart and cashier table rendered beside it. Three
 * independent requests, and one of them falling over should not blank the
 * other two.
 *
 * The labels say what the endpoint returns and nothing more. Copy
 * qualifying them ("since 8am yesterday", "count includes voided") was
 * considered and rejected: it documents a backend bug instead of fixing
 * it, and reads worse than the wrong number. Both behaviours are recorded
 * in `BACKEND_NOTES.md` and are the backend developer's to change. */
export function TodayFigures() {
  const { data, isLoading, isError } = useQuery({
    queryKey: DASHBOARD_TODAY_QUERY_KEY,
    queryFn: getDashboardToday,
  });

  if (isError) {
    return (
      <Card.Root>
        <Card.Body>
          <Text c="danger.7">Couldn't load today's figures.</Text>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
      <StatTile
        label="Transactions Today"
        value={String(data?.transactions_today ?? 0)}
        isLoading={isLoading}
      />
      <StatTile
        label="Earnings Today"
        value={formatCurrency(data?.earnings_today ?? 0)}
        isLoading={isLoading}
      />
    </SimpleGrid>
  );
}
