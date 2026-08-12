import { useEffect, useState } from "react";
import { ActionIcon, NumberInput, Table, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { formatCurrency } from "../lib/currency";
import { calculateLineSubtotal } from "../lib/receipt";
import type { ReceiptLineItem } from "../types";

type ReceiptLineItemRowProps = {
  lineItem: ReceiptLineItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
};

export function ReceiptLineItemRow({
  lineItem,
  onQuantityChange,
  onRemove,
}: ReceiptLineItemRowProps) {
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
    <Table.Tr>
      <Table.Td style={{ py: 6 }}>
        <Text size="sm" fw={500} truncate="end">
          {lineItem.name}
        </Text>
      </Table.Td>

      <Table.Td style={{ py: 6 }}>
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
          aria-label={`Quantity of ${lineItem.name}`}
          styles={{
            input: {
              textAlign: "center",
              fontWeight: 600,
            },
          }}
        />
      </Table.Td>

      <Table.Td style={{ textAlign: "right", py: 6 }}>
        <Text size="xs" c="dimmed">
          {formatCurrency(lineItem.price)}
        </Text>
      </Table.Td>

      <Table.Td style={{ textAlign: "right", py: 6 }}>
        <Text size="sm" fw={700}>
          {formatCurrency(calculateLineSubtotal(lineItem))}
        </Text>
      </Table.Td>

      <Table.Td style={{ textAlign: "center", py: 6 }}>
        <ActionIcon
          variant="subtle"
          color="red"
          size="md"
          onClick={onRemove}
          aria-label={`Remove ${lineItem.name}`}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  );
}
