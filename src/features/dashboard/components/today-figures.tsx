import { SimpleGrid, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/utils/currency";
import { getDashboardToday } from "../api/get-dashboard-today";
import { StatTile } from "./stat-tile";

/** The two figures every user sees, scoped by the endpoint. Owns its own
 * request and error state, so a failure here leaves the rest of the
 * dashboard rendered.
 *
 * The labels say what the endpoint returns and nothing more: qualifying
 * copy would document a backend quirk instead of fixing it. Both are in
 * BACKEND_NOTES.md. */
export function TodayFigures() {
  const { data, isLoading, isError } = useQuery({
    // Inline, like the other two sections: nothing invalidates these
    // keys, because the dashboard has no mutations.
    queryKey: ["dashboard-today"],
    queryFn: getDashboardToday,
  });

  if (isError) {
    return (
      <Card.Root>
        <Card.Body>
          <Text c="danger">
            Couldn't load today's figures. Please try again.
          </Text>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
      <StatTile
        label="Transactions Today"
        value={String(data?.transactions_today ?? 0)}
        accent="primary"
        isLoading={isLoading}
      />
      <StatTile
        label="Earnings Today"
        value={formatCurrency(data?.earnings_today ?? 0)}
        accent="success"
        isLoading={isLoading}
      />
    </SimpleGrid>
  );
}
