import {
  Anchor,
  Badge,
  Divider,
  Drawer,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { formatDateTime } from "@/utils/date-time";
import { getActivityLogDetail } from "../api/get-activity-log-detail";
import { activityLogDetailQueryKey } from "../api/activity-log-query-keys";
import { subjectLabel, subjectRoute } from "../lib/activity-subject";
import type {
  ActivityLogDetail,
  ActivityLogListRow,
  ActivityLogSubject,
} from "../types";
import { ActivityDetailsSkeleton } from "./activity-details-skeleton";

type ActivityLogDrawerProps = {
  /** The clicked row, not an id: holding it is what lets the drawer open
   * on data already in hand. */
  entry: ActivityLogListRow | null;
  onClose: () => void;
};

/** One entry's detail, opened on the row's own type, context, actor and
 * timestamp while the rest is still loading. */
export function ActivityLogDrawer({ entry, onClose }: ActivityLogDrawerProps) {
  return (
    <Drawer
      opened={entry !== null}
      onClose={onClose}
      position="right"
      size="md"
      title={entry?.type}
      closeButtonProps={{ "aria-label": "Close" }}
    >
      {entry && <ActivityLogDrawerBody entry={entry} />}
    </Drawer>
  );
}

/** Split out so the query exists only while an entry is open: unmounted,
 * it never fires. */
function ActivityLogDrawerBody({ entry }: { entry: ActivityLogListRow }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: activityLogDetailQueryKey(entry.id),
    queryFn: () => getActivityLogDetail(entry.id),
  });

  return (
    <Stack gap="md">
      <Text>{entry.context}</Text>

      <Group justify="space-between" gap="xs">
        <Group gap="xs">
          <Text size="sm" fw={600}>
            {entry.actor.name}
          </Text>
          {entry.actor.role && (
            <Badge size="sm" variant="light">
              {entry.actor.role}
            </Badge>
          )}
        </Group>
        <Text size="sm" c="dimmed">
          {formatDateTime(entry.created_at)}
        </Text>
      </Group>

      <Divider />

      <Text size="xs" fw={700} c="dimmed">
        DETAILS
      </Text>
      {isLoading ? (
        <ActivityDetailsSkeleton />
      ) : isError || !data ? (
        <Text size="sm" c="danger">
          Couldn&apos;t load this entry&apos;s details.
        </Text>
      ) : (
        <ActivityDetailsList detail={data} />
      )}
    </Stack>
  );
}

/** No per-type branching: every action's details arrive in one shape,
 * already formatted. See `ActivityLogDetailField`. */
function ActivityDetailsList({ detail }: { detail: ActivityLogDetail }) {
  return (
    <Stack gap="md">
      {detail.details.length === 0 ? (
        <Text size="sm" c="dimmed">
          This entry recorded no further detail.
        </Text>
      ) : (
        <Stack gap="xs">
          {detail.details.map((field, index) => (
            <Group
              key={`${field.label}-${index}`}
              justify="space-between"
              gap="xl"
              wrap="nowrap"
              align="flex-start"
            >
              <Text size="sm" c="dimmed">
                {field.label}
              </Text>
              <Text size="sm" ta="right">
                {field.value}
              </Text>
            </Group>
          ))}
        </Stack>
      )}

      <Divider />

      <Text size="xs" fw={700} c="dimmed">
        RECORD
      </Text>
      <ActivitySubjectReference subject={detail.subject} />
    </Stack>
  );
}

/** Type and identifier always; a link only when the record still exists
 * and its type has a route. */
function ActivitySubjectReference({
  subject,
}: {
  subject: ActivityLogSubject;
}) {
  const label = subjectLabel(subject);
  const route = subjectRoute(subject);

  if (route) {
    return (
      <Anchor component={Link} to={route} size="sm">
        {label}
      </Anchor>
    );
  }

  return (
    <Text size="sm" c={subject.exists ? undefined : "dimmed"}>
      {subject.exists ? label : `${label} no longer exists`}
    </Text>
  );
}
