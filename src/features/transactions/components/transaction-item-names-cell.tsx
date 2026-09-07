import { Text } from "@mantine/core";
import type { TransactionListItemDTO } from "../types";

/** How many names a row shows before it starts counting instead. Two,
 * because this column sits between six others in a table already carrying
 * a date, a payer name and a cashier name — a row that listed eight fees
 * would push everything else off the visible width. */
const MAX_NAMED = 2;

/**
 * The fees a transaction contained, as a summary. The list endpoint sends
 * only an id and a name, and names are shown because item name is one of
 * this page's filters: a result that doesn't say which item matched leaves
 * the user opening rows to find out.
 *
 * The full list is on the cell's `title`, which is a mouse affordance; the
 * detail page one click away is the keyboard-reachable answer.
 */
export function TransactionItemNamesCell({
  items,
}: {
  items: TransactionListItemDTO[];
}) {
  if (items.length === 0) {
    // A completed transaction always has at least one item — the server
    // refuses to save one that doesn't. A pending one hasn't got there
    // yet, and this page lists every status.
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  }

  const names = items.map((item) => item.name);
  const named = names.slice(0, MAX_NAMED);
  const remaining = names.length - named.length;

  return (
    <Text size="sm" title={names.join(", ")}>
      {named.join(", ")}
      {remaining > 0 && (
        <Text span size="sm" c="dimmed">
          {` +${remaining} more`}
        </Text>
      )}
    </Text>
  );
}
