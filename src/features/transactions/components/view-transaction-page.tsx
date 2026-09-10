import { Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowLeft, IconPrinter } from "@tabler/icons-react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/button";
import { useTransactionDetail } from "../hooks/use-transaction-detail";
import { formatDateTime } from "@/utils/date-time";
import { isPrintable, printRefusalReason } from "../lib/transaction-status";
import { TransactionItemsTable } from "./transaction-items-table";
import { TransactionStatusBadge } from "./transaction-status-badge";
import { TransactionDetailFallback } from "./transaction-detail-fallback";
import { TransactionDetailSkeleton } from "./transaction-detail-skeleton";

/** Where a Back with no history entry to pop goes instead. */
const TRANSACTIONS_LIST_PATH = "/transactions/receipts";

/** Where this page was opened from, if the caller said. Absent for a
 * bookmark, a pasted link, or a refresh — `location.state` does not
 * survive one. */
type ViewTransactionFrom = { from?: "list" | "new" | "dashboard" };

/** Two origins pop history; only the label differs, and it has to, since
 * it names where the click actually lands. */
const BACK_LABEL: Record<string, string> = {
  dashboard: "Back to Dashboard",
  list: "Back to Transactions",
  unknown: "Back to Transactions",
};

export function ViewTransactionPage() {
  const { controlId } = useParams<{ controlId: string }>();
  const id = Number(controlId);
  const detail = useTransactionDetail(id);
  const { transaction, isUnavailable } = detail;
  const navigate = useNavigate();
  const { state } = useLocation() as { state: ViewTransactionFrom | null };

  /** Suppressed only for the post-confirm arrival, where the draft has
   * already been reset and there is nothing behind this page to go back
   * to. Everything else gets one, including a refresh that lost the state
   * above: an unnecessary Back is a smaller failure than a missing one. */
  const backTo = state?.from === "new" ? null : state?.from ?? "unknown";

  return (
    <>
      {backTo && (
        <UnstyledButton
          onClick={() =>
            // -1 for a real history entry, so the list comes back on the
            // page and filters the user left it on. A bookmark has no such
            // entry, so it gets the list's own path instead.
            backTo === "unknown"
              ? navigate(TRANSACTIONS_LIST_PATH)
              : navigate(-1)
          }
          mb="xs"
        >
          <Text
            size="sm"
            c="dimmed"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <IconArrowLeft size={14} /> {BACK_LABEL[backTo]}
          </Text>
        </UnstyledButton>
      )}

      <Card.Root>
        <Card.Header title="View Transaction" />
        <Card.Divider />
        <Card.Body>
          {isUnavailable || !transaction ? (
            <TransactionDetailFallback
              detail={detail}
              loading={<TransactionDetailSkeleton />}
            />
          ) : (
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <Group gap={4}>
                  <Text size="sm" c="dimmed">
                    Customer Name:
                  </Text>
                  <Text size="sm" fw={700}>
                    {transaction.customer_name ?? "—"}
                  </Text>
                  <Box ml="xs">
                    <TransactionStatusBadge status={transaction.status} />
                  </Box>
                </Group>
                <Stack gap={0} align="flex-end">
                  <Text size="sm" c="dimmed">
                    Control ID: {transaction.control_id}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Series No.: {transaction.series_number ?? "—"}
                  </Text>
                </Stack>
              </Group>

              {/* The only place in the app that can show who voided a
                  transaction: no list endpoint loads `voidedBy`.

                  Gated on the timestamp, which is the field being rendered.
                  The name falls back because the two arrive by different
                  routes, and a missing eager load should read as an unknown
                  admin rather than as a missing line. */}
              {transaction.voided_at && (
                <Text size="sm" c="dimmed">
                  Voided on {formatDateTime(transaction.voided_at)} by{" "}
                  {transaction.voided_by?.full_name ?? "an unknown admin"}
                </Text>
              )}

              <TransactionItemsTable
                items={transaction.items}
                total={transaction.total}
                amountPaid={transaction.amount_paid}
                changeAmount={transaction.change_amount}
              />

              {/* The button stays, disabled, rather than disappearing.
                  Someone who prints these all day reads a missing Print
                  button as the page having failed to load; the badge above
                  and the reason below answer the question before it is
                  asked. */}
              <Stack gap={4} align="center">
                <PrimaryButton
                  onClick={() =>
                    navigate(`/transactions/${transaction.control_id}/print`)
                  }
                  leftSection={<IconPrinter size={16} />}
                  disabled={!isPrintable(transaction.status)}
                >
                  Print
                </PrimaryButton>
                {!isPrintable(transaction.status) && (
                  <Text size="xs" c="dimmed" ta="center">
                    {printRefusalReason(transaction.status)}
                  </Text>
                )}
              </Stack>
            </Stack>
          )}
        </Card.Body>
      </Card.Root>
    </>
  );
}
