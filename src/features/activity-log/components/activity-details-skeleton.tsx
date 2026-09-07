import { Group, Skeleton, Stack } from "@mantine/core";

/** Most actions produce three or four detail fields, so the drawer neither
 * jumps taller nor collapses when they land. */
const PLACEHOLDER_FIELD_COUNT = 3;

/**
 * The details region's own shape in placeholders, matching how the shared
 * table loads. Only this region is a skeleton: type, description, actor and
 * timestamp came off the row and are already on screen.
 */
export function ActivityDetailsSkeleton() {
  return (
    <Stack gap="sm" aria-busy="true" data-testid="activity-details-skeleton">
      {Array.from({ length: PLACEHOLDER_FIELD_COUNT }).map((_, field) => (
        <Group key={`skeleton-field-${field}`} justify="space-between" gap="xl">
          <Skeleton height={14} width={110} radius="lg" />
          <Skeleton height={14} width={150} radius="lg" />
        </Group>
      ))}
    </Stack>
  );
}
