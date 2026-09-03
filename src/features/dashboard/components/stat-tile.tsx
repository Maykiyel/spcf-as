import { Skeleton, Text } from "@mantine/core";
import { Card } from "@/components/ui/card";

type StatTileProps = {
  label: string;
  value: string;
  isLoading: boolean;
};

/** One headline figure. The label and the value are separate text nodes
 * on purpose, so a test can assert on either without matching across an
 * element boundary. */
export function StatTile({ label, value, isLoading }: StatTileProps) {
  return (
    <Card.Root>
      <Card.Body gap="xs">
        <Text size="sm" c="dimmed">
          {label}
        </Text>
        {isLoading ? (
          <Skeleton height={32} width="60%" />
        ) : (
          <Text fz={32} fw={700} lh={1.2}>
            {value}
          </Text>
        )}
      </Card.Body>
    </Card.Root>
  );
}
