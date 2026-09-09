import { Group, Text } from "@mantine/core";
import { formatCurrency } from "@/utils/currency";

type TransactionReportTotalProps = {
  /** The server's figure for the whole filtered set, never a sum of the
   * visible rows. Undefined until the first response lands. */
  total: number | undefined;
  isError: boolean;
};

/** A failed request must never read as a zero total, so an absent figure
 * says so rather than falling back to a formatted 0. See #64, story 14. */
export function TransactionReportTotal({
  total,
  isError,
}: TransactionReportTotalProps) {
  return (
    <Group justify="flex-end" gap="sm" py="sm">
      <Text size="sm" c="dimmed">
        Total earnings for this period
      </Text>
      <Text fw={700} size="lg" data-testid="report-total">
        {isError ? "Unavailable" : total === undefined ? "—" : formatCurrency(total)}
      </Text>
    </Group>
  );
}
