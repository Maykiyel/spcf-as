import { StatusBadge } from "@/components/ui/status-badge";
import { activityAreaTone } from "../lib/activity-area-tone";

/** One entry's type, coloured by area. Shared by the list's Type column
 * and the detail drawer's title, so the two can't disagree. */
export function ActivityTypeBadge({ type }: { type: string }) {
  return <StatusBadge label={type} tone={activityAreaTone(type)} />;
}
