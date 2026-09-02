import { useEffect, useState } from "react";
import { ActionIcon, Loader, NumberInput, Table, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { formatCurrency } from "../lib/currency";
import { calculateLineSubtotal } from "../lib/transaction-draft";
import type { DraftLineItem } from "../types";

type TransactionLineItemRowProps = {
  lineItem: DraftLineItem;
  // True once the cashier has asked to remove this line but it was still
  // locked at the time (no real backend id yet, or a repeat-add for this
  // fee hasn't settled) — the removal is queued and will fire for real
  // once that settles (see applyQueuedIntent in the builder context).
  // Quantity edits and removal are otherwise never blocked: an add's
  // in-flight/debouncing state on a line no longer disables anything —
  // see PendingLineItemIntent's doc comment for why.
  pendingRemoval: boolean;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
};

export function TransactionLineItemRow({
  lineItem,
  pendingRemoval,
  onQuantityChange,
  onRemove,
}: TransactionLineItemRowProps) {
  const [draftQuantity, setDraftQuantity] = useState<number | string>(
    lineItem.quantity,
  );

  useEffect(() => {
    setDraftQuantity(lineItem.quantity);
  }, [lineItem.quantity]);

  const handleQuantityChange = (value: number | string) => {
    setDraftQuantity(value);
    if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
      onQuantityChange(value);
    }
  };

  const commitQuantity = () => {
    const parsed =
      typeof draftQuantity === "number" ? draftQuantity : Number(draftQuantity);
    const nextQuantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    setDraftQuantity(nextQuantity);
    onQuantityChange(nextQuantity);
  };

  return (
    <Table.Tr style={pendingRemoval ? { opacity: 0.5 } : undefined}>
      <Table.Td py="sm">
        <Text size="sm" fw={500} truncate="end">
          {lineItem.name}
        </Text>
      </Table.Td>

      <Table.Td py="sm">
        <NumberInput
          value={draftQuantity}
          onChange={handleQuantityChange}
          onBlur={commitQuantity}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitQuantity();
              event.currentTarget.blur();
            }
          }}
          min={1}
          max={99}
          size="xs"
          w={64}
          hideControls
          allowNegative={false}
          // Only disabled once removal is already queued for this line —
          // editing quantity on something you've already asked to remove
          // doesn't make sense. Never disabled just because an add is
          // still syncing; see the pendingRemoval doc comment above.
          disabled={pendingRemoval}
          aria-label={`Quantity of ${lineItem.name}`}
          styles={{
            input: {
              textAlign: "center",
              fontWeight: 600,
            },
          }}
        />
      </Table.Td>

      <Table.Td py="sm" style={{ textAlign: "right" }}>
        <Text size="xs" c="dimmed">
          {formatCurrency(lineItem.price)}
        </Text>
      </Table.Td>

      <Table.Td py="sm" style={{ textAlign: "right" }}>
        <Text size="sm" fw={700}>
          {formatCurrency(calculateLineSubtotal(lineItem))}
        </Text>
      </Table.Td>

      <Table.Td py="sm" style={{ textAlign: "center" }}>
        {pendingRemoval ? (
          <Loader
            size="xs"
            aria-label={`Removing ${lineItem.name}`}
            role="status"
          />
        ) : (
          <ActionIcon
            variant="subtle"
            color="red"
            size="md"
            onClick={onRemove}
            aria-label={`Remove ${lineItem.name}`}
          >
            <IconTrash size={16} />
          </ActionIcon>
        )}
      </Table.Td>
    </Table.Tr>
  );
}
