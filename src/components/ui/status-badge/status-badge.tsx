import { Badge } from "@mantine/core";

/** The app's semantic colour names, minus `navy` and `dark`: those style
 * chrome, not a status. `danger` is reserved for a reversal — see
 * `components/ui/README.md`. */
export type Tone =
  | "primary"
  | "tertiary"
  | "success"
  | "warning"
  | "neutral"
  | "accent"
  | "danger";

/** A label plus a semantic tone, in Mantine's `light` variant. Knows no
 * domain concept: every call site supplies its own `Record<Status, Tone>`
 * lookup. See `components/ui/README.md` for why `tone` is a prop here
 * rather than a named variant per status. */
export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Badge color={tone} variant="light">
      {label}
    </Badge>
  );
}
