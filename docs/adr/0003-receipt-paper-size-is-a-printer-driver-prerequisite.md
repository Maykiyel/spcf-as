# Acknowledgement Receipt paper size is a printer-driver prerequisite, not app configuration

`PrintAcknowledgementReceiptPage` declares `@page { size: 8.5in 4in; }` to
match the accounting office's actual receipt stock. That rule is correct and
is doing everything it can — but when the print destination is a real
physical printer, it does not decide the page size. The printer's OS driver
exposes only the paper sizes it has registered, and the browser's print
engine can only select from that list. It cannot invent a size the driver
doesn't know about, so the job silently falls back to a standard size
(Letter/A4).

This is why the size works when printing to "Save as PDF" and nowhere else:
a virtual destination has no physical constraints. The symptom is not a
CSS bug, a browser bug, or a mistake in this repo — it reproduced on every
browser tested, and the same mechanism is documented for unrelated desktop
applications and for POS/receipt printers generally. The reasoning and
sources are in
[`docs/research/print-dialog-timing-and-paper-size.md`](../research/print-dialog-timing-and-paper-size.md).

The fix is registering an 8.5in x 4in custom size in each workstation's
printer driver preferences. This was confirmed on real hardware (an Epson
L120): once registered, the size becomes selectable in the browser's print
dialog.

A silent-printing alternative (Chromium's `--kiosk-printing`) would sidestep
the negotiation entirely by removing the dialog. It was **not** adopted — it
reopens the deliberate earlier decision that the cashier sees and can cancel
a print dialog.

## Consequences

Every cashier workstation needs this driver-level setup performed
independently, before the app is usable for its intended purpose. Nothing in
this repository can perform, detect, or verify it, and nothing in `git`
carries it — a fresh clone on a correctly-configured machine and on an
unconfigured one behave identically in code and differently on paper. Treat
it as a deployment prerequisite, not a support issue: the procedure is
[`docs/operations/printer-setup.md`](../operations/printer-setup.md).

Don't "fix" the fallback in frontend code. Dynamic sizing, scaling hacks, or
loosening `@page` to a standard size would each trade a correct declaration
for a wrong one, and none of them can reach the driver layer where the
constraint actually lives. If the office's hardware ever genuinely can't
register the size, that's a re-decision (revisit `--kiosk-printing`, or the
paper stock itself), not a code workaround.
