import { Skeleton, Text } from "@mantine/core";
import { Card } from "@/components/ui/card";

/** Which theme colour runs down the tile's left edge. Named rather than a
 * free-form colour string so a tile can only ever be one of the app's own,
 * and so the choice reads as a meaning rather than as a hex value. */
type StatTileAccent = "primary" | "success";

type StatTileProps = {
  label: string;
  value: string;
  accent: StatTileAccent;
  isLoading: boolean;
};

/** One headline figure.
 *
 * The label and the value are separate text nodes on purpose, so a test
 * can assert on either without matching across an element boundary.
 *
 * The accent bar is a border on `Card.Root` rather than a coloured box
 * inside it: `Card.Root` already clips to its own radius, so a child
 * would need the corner geometry repeated to sit flush. */
export function StatTile({ label, value, accent, isLoading }: StatTileProps) {
  return (
    <Card.Root
      style={{
        borderLeft: `4px solid var(--mantine-color-${accent}-6)`,
      }}
    >
      <Card.Body gap="xs">
        <Text
          fz="md"
          fw={700}
          c={`${accent}.7`}
          tt="uppercase"
          lts="0.5px"
          pt="md"
        >
          {label}
        </Text>
        {isLoading ? (
          <Skeleton height={38} width="60%" />
        ) : (
          <Text fz={34} fw={700} lh={1.2} c="navy.8">
            {value}
          </Text>
        )}
      </Card.Body>
    </Card.Root>
  );
}
