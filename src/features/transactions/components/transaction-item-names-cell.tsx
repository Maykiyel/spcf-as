import { Text } from "@mantine/core";
import type { TransactionListItemDTO } from "../types";

/** How many names a row shows before it starts counting instead. Two,
 * because this column sits between six others in a table already carrying
 * a date, a payer name and a cashier name — a row that listed eight fees
 * would push everything else off the visible width. */
const MAX_NAMED = 2;

/**
 * The fees a transaction contained, as a summary.
 *
 * The list endpoint returns items stripped to an identifier and a name —
 * no price, no quantity, no subtotal. Names are shown anyway because item
 * name is one of this page's filters, and a result list that doesn't say
 * which item matched leaves the user opening rows to find out. Per-item
 * money stays on the detail page, which is the page that has it.
 *
 * The full list is on the cell's `title` so an overflowing row can still be
 * read without opening it. That is a mouse affordance, not the answer for
 * everyone: the detail page one click away is where the complete, priced
 * list lives, and it is reachable from this row by keyboard.
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
