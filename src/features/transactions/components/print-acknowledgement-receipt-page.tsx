import { useEffect, useRef } from "react";
import { Box, Center, Loader, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router";
import { useTransactionDetail } from "../hooks/use-transaction-detail";
import { AcknowledgementReceiptCopy } from "./acknowledgement-receipt-copy";

// How long to wait for the receipt's images (the school logo, rendered
// once per copy) to finish loading before printing anyway. Bounded
// deliberately: never block printing indefinitely on a slow or broken
// image in production, and — separately — jsdom's <img> never fires
// load/error at all (it doesn't perform real network/image decoding),
// so an unbounded wait would hang every test that reaches this code path.
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
// Custom paper size confirmed with the accounting office (their actual
// receipt stock). An explicit small margin matters here: without one,
// the browser's default page margin (often 0.4-1in per side) is applied
// *inside* this already-tiny 4in height, eating real content space and
// causing overflow. Forces a page break between the two copies so a
// longer transaction can never split a table row across the
// Accounting/Student boundary — only the first copy needs the trailing
// break, since a break after the last copy would print a blank page.
const PRINT_STYLES = `
  @page { size: 8.5in 4in; margin: 0.15in; }
  @media print {
    .no-print { display: none; }
    .print-page-root { padding: 0 !important; }
  }
`;

export function PrintAcknowledgementReceiptPage() {
  const { controlId } = useParams<{ controlId: string }>();
  const id = Number(controlId);
  const { transaction, isLoading, isForbidden, isError } =
    useTransactionDetail(id);
  const navigate = useNavigate();

  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (!transaction) return;

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

    // The per-invocation `cancelled` flag (not just the persistent
    // hasPrintedRef) matters specifically for StrictMode: its dev-mode
    // double-invocation of the initial mount's effect (mount -> cleanup
    // -> mount again) gives the *first* invocation's async chain this
    // cleanup before it can reach the print step — cancelling it here,
    // rather than via a ref set at entry, is what lets the *second*
    // (persisting) invocation still go on to print normally. hasPrintedRef
    // then separately guards against printing more than once for the
    // lifetime of this page if `transaction` were ever to change again
    // after a real, successful print (not expected in practice —
    // refetchOnWindowFocus is disabled project-wide — but not something
    // to rely on silently).
    return () => {
      cancelled = true;
      if (rafId1 !== null) cancelAnimationFrame(rafId1);
      if (rafId2 !== null) cancelAnimationFrame(rafId2);
    };
  }, [transaction]);

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

      {isLoading ? (
        <Center py="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed" ml="xs">
            Loading transaction...
          </Text>
        </Center>
      ) : isForbidden ? (
        <Text ta="center" c="danger" py="xl">
          You don't have access to this transaction.
        </Text>
      ) : isError || !transaction ? (
        <Text ta="center" c="danger" py="xl">
          Couldn't load this transaction. Please try again.
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
