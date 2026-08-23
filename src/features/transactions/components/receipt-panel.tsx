import type { FormEvent } from "react";
import {
  Badge,
  Divider,
  Group,
  NumberInput,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconCash, IconReceipt, IconUser } from "@tabler/icons-react";
import { DangerButton, PrimaryButton } from "@/components/ui/button";
import { useReceiptBuilder } from "./use-receipt-builder";
import { ReceiptLineItemRow } from "./receipt-line-item-row";
import { formatCurrency } from "../lib/currency";

export function ReceiptPanel() {
  const { state, actions, meta } = useReceiptBuilder();

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (meta.canConfirm) {
      actions.confirmTransaction();
    }
  };

  return (
    <form onSubmit={handleFormSubmit} style={{ height: "100%" }}>
      <Stack gap="sm" h="100%" style={{ minHeight: 0 }}>
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconReceipt size={24} />
            <Title order={4}>Receipt</Title>
          </Group>
          {state.lineItems.length > 0 && (
            <Badge variant="light" color="dark" size="sm">
              {state.lineItems.length}{" "}
              {state.lineItems.length === 1 ? "Item" : "Items"}
            </Badge>
          )}
        </Group>

        <TextInput
          label="Payer Name"
          placeholder="Enter student / payer name"
          value={state.payerName}
          onChange={(event) => actions.setPayerName(event.currentTarget.value)}
          leftSection={<IconUser size={16} />}
          required
          size="sm"
        />

        <Table.ScrollContainer minWidth={0} style={{ flex: 1, minHeight: 0 }}>
          <Table
            layout="fixed"
            verticalSpacing={4}
            horizontalSpacing="xs"
            stickyHeader
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fee</Table.Th>
                <Table.Th w={70}>Qty</Table.Th>
                <Table.Th w={80} style={{ textAlign: "right" }}>
                  Price
                </Table.Th>
                <Table.Th w={90} style={{ textAlign: "right" }}>
                  Subtotal
                </Table.Th>
                <Table.Th w={40} style={{ textAlign: "center" }} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {state.lineItems.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      No fees added yet. Click items in the catalog to build
                      this receipt.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                state.lineItems.map((lineItem) => (
                  <ReceiptLineItemRow
                    key={lineItem.id}
                    lineItem={lineItem}
                    pendingRemoval={meta.pendingRemovalFeeItemIds.has(
                      lineItem.feeItemId,
                    )}
                    onQuantityChange={(quantity) =>
                      actions.setLineItemQuantity(lineItem.id, quantity)
                    }
                    onRemove={() => actions.removeLineItem(lineItem.id)}
                  />
                ))
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Stack gap="xs">
          <Divider />

          <Group justify="space-between" align="center">
            <Text fw={600} size="sm">
              Total Amount Due
            </Text>
            <Text fw={800} size="xl" c="primary.6">
              {formatCurrency(meta.total)}
            </Text>
          </Group>

          <NumberInput
            label="Amount Paid"
            placeholder="0.00"
            value={state.amountPaid === 0 ? "" : state.amountPaid}
            onChange={(value) => {
              // NumberInput's onChange gives a string instead of a number
              // in a few edge cases — notably "trailing decimals", which
              // fixedDecimalScale triggers constantly (every value here
              // is padded to 2 decimals, e.g. "1000.00"). Coercing only
              // `typeof value === "number"` and dropping everything else
              // to 0 was wrong: it silently zeroed amountPaid on exactly
              // the padded values fixedDecimalScale produces, while the
              // field kept showing what was typed.
              const parsed = typeof value === "number" ? value : Number(value);
              actions.setAmountPaid(Number.isFinite(parsed) ? parsed : 0);
            }}
            leftSection={<IconCash size={16} />}
            min={0}
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator=","
            size="sm"
            disabled={state.lineItems.length === 0}
          />

          <Group justify="space-between" align="center">
            <Text fw={600} size="sm">
              Change
            </Text>
            <Text fw={700} size="md">
              {formatCurrency(meta.change)}
            </Text>
          </Group>

          <Group justify="flex-end" mt="xs">
            <DangerButton
              type="button"
              size="sm"
              disabled={
                (state.lineItems.length === 0 && !state.payerName) ||
                meta.isCancelling ||
                meta.isConfirming
              }
              loading={meta.isCancelling}
              onClick={actions.cancelReceipt}
            >
              Cancel
            </DangerButton>

            <Tooltip
              label={`Required: ${meta.missingRequirements.join(", ")}`}
              disabled={meta.canConfirm}
              position="top"
              withArrow
            >
              <div>
                <PrimaryButton
                  type="submit"
                  size="md"
                  disabled={!meta.canConfirm || meta.isConfirming}
                  loading={meta.isConfirming}
                >
                  Confirm Payment
                </PrimaryButton>
              </div>
            </Tooltip>
          </Group>
        </Stack>
      </Stack>
    </form>
  );
}
