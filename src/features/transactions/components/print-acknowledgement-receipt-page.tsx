import { useEffect, useRef } from "react";
import { Box, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router";
import { useTransactionDetail } from "../hooks/use-transaction-detail";
import { isPrintable, printRefusalReason } from "../lib/transaction-status";
import { AcknowledgementReceiptCopy } from "./acknowledgement-receipt-copy";
import { TransactionDetailFallback } from "./transaction-detail-fallback";

// Bounded so a slow or broken logo never blocks printing, and so tests
// don't hang: jsdom's <img> fires neither load nor error.
const IMAGE_READY_TIMEOUT_MS = 400;

function waitForImage(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    setTimeout(done, IMAGE_READY_TIMEOUT_MS);
  });
}
// The driver decides the physical page: 8.5x4in must be registered per
// workstation. See docs/operations/printer-setup.md and ADR 0003.
//
// The explicit margin is load-bearing, or the browser applies its own
// 0.4-1in inside a 4in height and content overflows. Inline rather than
// global because `@page` cannot be scoped.
const PRINT_STYLES = `
  @page { size: 8.5in 4in; margin: 0.15in; }
  @media print {
    .print-page-root { padding: 0 !important; }
  }
`;

export function PrintAcknowledgementReceiptPage() {
  const { controlId } = useParams<{ controlId: string }>();
  const id = Number(controlId);
  const detail = useTransactionDetail(id);
  const { transaction, isUnavailable } = detail;
  const navigate = useNavigate();

  const hasPrintedRef = useRef(false);

  // The same predicate the View page's Print button reads, which is what
  // stops the two drifting: there, it disables a button; here, it decides
  // whether a document exists to print at all.
  const canPrint = transaction !== undefined && isPrintable(transaction.status);

  useEffect(() => {
    // Gating the effect, not only the JSX. The dialog is fired from here
    // when the transaction resolves, so refusing in the render alone would
    // still pop a print dialog over the refusal message and leave someone
    // cancelling a dialog to read why they can't print.
    if (!transaction || !canPrint) return;

    let cancelled = false;
    let rafId1: number | null = null;
    let rafId2: number | null = null;

    const run = async () => {
      // Wait for the receipt's images (the school logo, once per copy)
      // to finish loading first — an unloaded image at print time is a
      // plausible source of the cross-browser "dialog opens before the
      // page is visibly ready" symptom, since it can still be causing a
      // layout reflow after window.print() would otherwise fire.
      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>(".print-page-root img"),
      );
      await Promise.all(images.map(waitForImage));
      if (cancelled || hasPrintedRef.current) return;

      // Then defer past an actual paint cycle: useEffect running after
      // commit is not the same as the browser having actually painted a
      // frame — it's only given the opportunity to. window.print() blocks
      // the main thread the instant it's called, so calling it in the
      // same tick can preempt that paint entirely. The first rAF callback
      // runs before the *next* repaint; nesting a second one pushes us
      // past it, guaranteeing at least one real paint has happened.
      rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          if (cancelled || hasPrintedRef.current) return;
          hasPrintedRef.current = true;
          window.print();
        });
      });
    };

    void run();

    // A per-invocation flag, not just `hasPrintedRef`: StrictMode's
    // double-invoked mount must cancel the first chain and still let the
    // second print. `hasPrintedRef` separately caps it at one print for
    // the life of the page.
    return () => {
      cancelled = true;
      if (rafId1 !== null) cancelAnimationFrame(rafId1);
      if (rafId2 !== null) cancelAnimationFrame(rafId2);
    };
  }, [transaction, canPrint]);

  return (
    <Box p="xs" className="print-page-root">
      <style>{PRINT_STYLES}</style>

      <UnstyledButton
        className="no-print"
        onClick={() => navigate(`/transactions/${controlId}`)}
        mb="xs"
      >
        <Text size="sm" c="dimmed" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <IconArrowLeft size={14} /> Back to Transaction
        </Text>
      </UnstyledButton>

      {/* `!transaction` is redundant with isUnavailable at runtime — it's
          here to narrow the type for the branch below. */}
      {isUnavailable || !transaction ? (
        <TransactionDetailFallback detail={detail} />
      ) : !canPrint ? (
        /* Refused in place, not redirected: a redirect leaves someone
           arriving from a stale bookmark bounced with no idea why.
           `TransactionDetailFallback` answers "no transaction"; here we
           have one, and the refusal is about what may be done with it. */
        <Text ta="center" c="danger" py="xl">
          {printRefusalReason(transaction.status)}
        </Text>
      ) : (
        <Stack gap={0}>
          <Box style={{ breakAfter: "page", pageBreakAfter: "always" }}>
            <AcknowledgementReceiptCopy
              transaction={transaction}
              copyLabel="ACCOUNTING OFFICE'S COPY"
            />
          </Box>
          <AcknowledgementReceiptCopy
            transaction={transaction}
            copyLabel="STUDENT'S COPY"
          />
        </Stack>
      )}
    </Box>
  );
}
