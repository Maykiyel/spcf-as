# Printer setup for Acknowledgement Receipts

**Who this is for:** whoever provisions a cashier workstation for the
accounting office — and, for Part 2, the cashier who first uses it.

**Do this before the workstation is handed over.** Until it's done, the
Print Acknowledgement Receipt page will still open and still print — it will
just print on the wrong paper size, silently. There is no error, no warning,
and nothing in the app can detect it. See
[ADR 0003](../adr/0003-receipt-paper-size-is-a-printer-driver-prerequisite.md)
for why this can't be solved in code.

The receipt stock is **8.5in x 4in** (215.9mm x 101.6mm).

## Part 1 — Register the custom paper size (once per machine, per printer)

Confirmed on Windows with an Epson L120. Other drivers use the same idea but
may word the menus differently; look for "custom" or "user defined" paper.

This is **per machine, not per Windows user** — registering the size once
covers every cashier who signs in on that workstation.

1. Open **Settings → Bluetooth & devices → Printers & scanners**, and pick
   the receipt printer.
2. Open **Printing preferences**.
3. Go to the **Layout** tab (some drivers call this Page Setup or Paper).
4. Open the **Paper Size** dropdown and choose **User Defined** (or
   "Custom").
5. Enter the size: **width 8.5in, height 4in**. If the driver only accepts
   millimetres, that's **215.9mm x 101.6mm**.
6. Give it a name the cashier will recognise in a dropdown — e.g.
   `Acknowledgement Receipt 8.5 x 4`.
7. **Save**, then **OK** out of Printing preferences.

If this printer is shared or reinstalled, or the machine is reimaged, the
custom size does not travel with it. Redo this.

## Part 2 — Select it once in the browser (first print on that machine)

The browser does **not** auto-select the registered size on the first print.
The cashier has to pick it once:

1. From the View Transaction page, click **Print**. The print dialog opens
   by itself.
2. Set **Destination** to the real receipt printer — **not** "Save as PDF".
   (Save as PDF ignores the driver entirely and will happily produce a
   correct-looking 8.5x4 preview even on a machine where Part 1 was never
   done. Don't use it to verify the setup.)
3. Open the **Paper size** dropdown and choose the size registered in
   Part 1.
4. Turn **Headers and footers off**. Left on, the browser prints the page
   URL and its own date into the receipt's margins.
5. Leave **Margins** at **Default**. The print page sets its own `@page`
   margin of `0.15in`; overriding it here fights that.
6. Print.

From then on the browser remembers the choice and auto-selects it on that
machine. This is the whole reason Part 2 exists as a distinct step — it is a
one-time correction, not something the cashier repeats per transaction.

**Tell the cashier this explicitly during turnover.** The one failure mode
worth naming out loud: if the paper size ever silently reverts to Letter (a
driver reinstall, a new printer, a different browser profile), the receipts
keep printing and only the paper is wrong. Whoever notices should redo
Part 1, then Part 2.

## Background

- [ADR 0003](../adr/0003-receipt-paper-size-is-a-printer-driver-prerequisite.md)
  — why this is a driver concern and not a frontend one.
- [`docs/research/print-dialog-timing-and-paper-size.md`](../research/print-dialog-timing-and-paper-size.md)
  — the sources and the ruled-out alternatives, including why silent
  printing (`--kiosk-printing`) was not adopted.
