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
import { formatSeriesNumber } from "@/utils/series-number";
import type { TransactionOrigin } from "../types";

/** Where Back goes when there is no history entry to pop. */
const TRANSACTIONS_LIST_PATH = "/transactions/receipts";

/** Where this page was opened from, if the caller said. Absent for a
 * bookmark, a pasted link, a refresh, or an unwired caller. Wording only —
 * see `backLabel`. */
type ViewTransactionState = { from?: TransactionOrigin };

/** One label per origin that gets a control at all. `Record`, not a
 * lookup with a fallback, so a new `TransactionOrigin` member with no
 * entry here fails the build instead of rendering "undefined". */
const BACK_LABEL: Record<Exclude<TransactionOrigin, "new">, string> = {
  list: "Back to Transactions",
  dashboard: "Back to Dashboard",
  void: "Back to Void",
  report: "Back to Transactions Report",
  activityLog: "Back to Activity Log",
  print: "Back to Receipt",
};

/** `null` renders no control. `hasHistory` false means a bookmark, a
 * pasted link, or a fresh tab: nothing behind this page, so the origin
 * (whatever it claims) is moot and the label names the fallback's real
 * destination instead. */
function backLabel(
  origin: TransactionOrigin | undefined,
  hasHistory: boolean,
): string | null {
  if (origin === "new") return null;
  if (!hasHistory) return "Back to Transactions";
  return origin ? BACK_LABEL[origin] : "Back";
}

export function ViewTransactionPage() {
  const { controlId } = useParams<{ controlId: string }>();
  const id = Number(controlId);
  const detail = useTransactionDetail(id);
  const { transaction, isUnavailable } = detail;
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location as { state: ViewTransactionState | null };

  // React Router keys the first location of a session's history "default"
  // (browser and memory router alike); any other key means a real entry
  // sits behind this one. That, not the origin marker, decides where Back
  // goes — a caller that forgot to set `state` no longer sends the user to
  // the wrong list, only to a plainer label.
  const hasHistory = location.key !== "default";
  const label = backLabel(state?.from, hasHistory);

  return (
    <>
      {label && (
        <UnstyledButton
          onClick={() =>
            hasHistory ? navigate(-1) : navigate(TRANSACTIONS_LIST_PATH)
          }
          mb="xs"
        >
          <Text
            size="sm"
            c="dimmed"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <IconArrowLeft size={14} /> {label}
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
                    Series No.: {formatSeriesNumber(transaction.series_number)}
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
