# Research: Cross-browser print dialog timing & custom paper size limitations

> **Outcome — both symptoms resolved and confirmed on real hardware.** This
> document is kept as the reasoning record; the short version is:
>
> - **Firefox early dialog:** hypothesis #1 below was correct. The print
>   effect now waits (bounded to 400ms) for the receipt's logo images to
>   load before deferring through a double `requestAnimationFrame`. Verified
>   fixed on real Firefox/Zen.
> - **Custom paper size:** hypothesis #3 below was correct, and #4 was not
>   needed — `--kiosk-printing` was **not** adopted, the print dialog stays.
>   Registering an 8.5in x 4in size in the printer driver's own preferences
>   makes it selectable. **This is a per-machine, per-printer setup step
>   that no code in this repo can perform** — see
>   [`docs/operations/printer-setup.md`](../operations/printer-setup.md) for
>   the turnover procedure and
>   [ADR 0003](../adr/0003-receipt-paper-size-is-a-printer-driver-prerequisite.md)
>   for why it's out of the frontend's reach.
> - **Open question in "Practical implication" below, now answered:** the
>   browser does *not* auto-select the registered size on the first print.
>   The cashier picks it from the dialog's paper-size dropdown once; the
>   browser remembers it and auto-selects it on subsequent prints.

Context: `PrintAcknowledgementReceiptPage` auto-triggers `window.print()` on
mount and declares `@page { size: 8.5in 4in; }`. Two symptoms reported
against real browsers (not reproducible in jsdom):

1. On Firefox-based browsers (Firefox, Zen), the print dialog appears to
   fire before the page has visually rendered, requiring 1-2 cancels
   before the page becomes visible. Chromium-based browsers (Chrome,
   Brave, Helium) do not exhibit this.
2. The custom `8.5in x 4in` page size is respected when the print
   destination is "Save as PDF", but is silently overridden (falls back to
   a standard size, e.g. Letter) when the destination is a real physical
   printer — on **every** browser tested, not just one engine.

No sub-agent tool was available in this environment, so this research was
done directly rather than dispatched to a background agent (same
adaptation noted for `/code-review` earlier in this session).

## Finding 1: Custom paper sizes are gated by the printer driver, not the browser, when printing to real hardware

This is a well-documented, long-standing, cross-application limitation —
not specific to this app, this browser, or even the web platform.

- **Chromium bug tracker, "Respect CSS @page property when selecting
  paper size"** (bugs.chromium.org #238303 / issues.chromium.org
  #41010929) — an open, long-running feature request asking Chromium to
  make the print dialog's paper-size selector actually honor `@page`
  when printing, still unresolved as of the most recent activity found.
  This confirms the gap is acknowledged by Chromium itself, not a
  configuration mistake on our end.
- **"Controlling the Settings in Chrome's Print Dialogue With CSS"**
  (excessivelyadequate.com, 2021): "non-Chromium-based browsers don't
  allow for specifying arbitrary paper sizes with CSS ... According to
  caniuse.com, this feature only works in Chromium-based browsers." This
  is dated (2021) and may be stale given the user's own testing shows
  Firefox *does* respect the custom size for "Save as PDF" — but it
  corroborates that Firefox's support for this has historically lagged
  and been inconsistent with Chromium's.
- **Independent corroboration from unrelated desktop applications**
  (Adobe InDesign, Acrobat, Photoshop Elements — community.adobe.com
  threads, 2017–2025): every thread shows the identical root pattern —
  a custom page size set in the *application* gets silently replaced
  with a standard size (Letter/A4) when printing to a real printer,
  unless that exact custom size is registered in the **printer driver's
  own settings** first. One reply states the mechanism plainly: "Not all
  apps can force a nonstandard size to a printer ... you have to set up
  your printer to expect and handle the paper size, whether it's a
  standard selection or a custom setup."
- **POS/receipt-printer documentation (Oracle CCS implementation guide)**
  describes the standard industry workflow for exactly this scenario:
  configure the custom paper size (e.g. "80 x 100 mm") directly in the
  printer driver's OS-level "Printing Preferences," not in the
  application or page CSS.

**Why "Save as PDF" works and a real printer doesn't:** "Save as PDF" is
a virtual destination with no physical constraints — the browser's PDF
renderer can produce literally any page dimensions declared in `@page`.
A real printer's OS driver exposes only *its own* registered/supported
paper sizes to the print subsystem; the browser's print engine can only
select among what that driver offers. It cannot invent a page size the
driver doesn't know about. This matches the reported symptom exactly:
content isn't scaled or corrupted, only the *page canvas itself* reverts
to a standard size — because the driver, not our CSS, is what's actually
governing the physical dimensions once a real printer is the target.

**Practical implication:** this is very likely not fixable from frontend
code alone. The `@page` rule is correct and doing what it can — the
constraint sits at the OS/printer-driver layer. The standard fix path
(per every corroborating source) is registering an 8.5in x 4in (or the
metric equivalent, if the driver expects mm) custom paper size directly
in the specific printer's driver preferences on the accounting office's
machine(s), the same way the Oracle POS guide describes doing for their
receipt printer. Once registered there, browsers can select it from the
print dialog's paper-size dropdown (manually, or in Chromium's case,
possibly auto-matched against `@page` if the registered size is close
enough — unconfirmed, would need the user's own testing once a custom
size actually exists in the driver).

**A separate, different path exists if a print dialog isn't required at
all:** Chromium supports a `--kiosk-printing` launch flag that bypasses
the print dialog entirely and sends the job silently to the OS's
*default* printer using that printer's already-configured default
settings (SchedulesPlus documentation; multiple corroborating threads on
POS/kiosk receipt printing). This sidesteps the paper-size-negotiation
problem entirely rather than solving it, since there's no dialog left to
show a wrong size in — but it's a materially different UX than what was
specified (a print dialog the cashier can review/cancel) and would need
to be raised as a new decision, not silently substituted.

## Finding 2: Firefox's early-dialog symptom — plausible mechanisms, none confirmed

Older Bugzilla threads (bug 80572, a 2011 WHATWG mailing list thread)
describe classic "`window.print()` called before the document finishes
loading" bugs from the early 2000s–2011 era, where Gecko/WebKit/IE all
historically deferred `print()` until `onload` fired if called mid-load.
**These don't directly apply here** — our call happens well after the
SPA's initial `onload`, during a client-side route transition, so
`document.readyState` is already `"complete"` by the time our effect
runs. I'm flagging this explicitly as a hypothesis I could **not**
confirm applies, not a diagnosis.

A more relevant data point: Mozilla Bugzilla #774398 (`window.matchMedia
lookup for print` discussion) states plainly how Gecko's print pipeline
actually works: **"the existing document is cloned and the clone is
printed."** If Gecko's clone step can occur essentially synchronously
relative to our deferred call — before Gecko's own layout/paint pipeline
has caught up with very recent DOM mutations or image decode completion
— a `requestAnimationFrame`-only deferral (tuned against Blink's
behavior, which "just works" per the user's own report) may not be a
long enough or reliable enough margin for Gecko specifically. This is
architecturally plausible given Gecko and Blink are different rendering
engines with different internal scheduling, but I have no primary source
confirming this exact interaction for a React SPA route-transition
scenario — MDN's `requestAnimationFrame` docs only describe the general
contract ("call before the next repaint"), not engine-specific latency
differences under this scenario.

**I was not able to find a primary source that directly explains this
specific symptom (double rAF sufficient in Blink, insufficient in
Gecko) for a client-side SPA print trigger.** This is the most
significant gap in this research — see Open Questions below.

## Ranked hypotheses (Phase 3, per /diagnosing-bugs)

None of these have been tested against a real loop — I cannot build one
here. Ranked by how directly the available evidence supports each one.

1. **(Firefox timing) The receipt's logo `<Image>` hasn't finished
   loading/decoding by the time the deferred `window.print()` fires,**
   and Chromium happens to already have it warm from an earlier
   navigation in the same session (e.g. the login page uses the same
   asset) while Firefox's image cache/decode timing differs enough to
   still be in-flight. *Prediction: if true, explicitly waiting on the
   logo image's `decode()`/`load` event before calling `window.print()`
   makes the Firefox symptom disappear, independent of any rAF tuning.*
   This is the most concretely falsifiable hypothesis and the easiest to
   test directly in a real browser.
2. **(Firefox timing) Two `requestAnimationFrame` calls are an
   insufficient deferral margin for Gecko's layout/paint pipeline
   specifically**, even with no image involved. *Prediction: adding a
   third rAF, or replacing rAF with a small fixed `setTimeout` (e.g.
   150-300ms) as a cross-engine-safe margin, makes the symptom disappear
   on Firefox without needing to touch anything image-related.* Weaker
   than #1 because I have no source confirming rAF-insufficiency
   specifically, only that Gecko's print pipeline works differently
   in principle (document-clone-based).
3. **(Paper size) The printer driver on the test machine(s) has no
   custom 8.5in x 4in size registered**, so every browser correctly
   falls back to its nearest standard size when targeting that driver.
   *Prediction: registering a matching custom size in the printer
   driver's OS-level preferences (Windows: Printing Preferences > Layout
   > Paper Size > "User Defined") makes the browser's print dialog
   offer/select it correctly.* This is the best-supported hypothesis in
   this whole document — corroborated by four independent, unrelated
   sources (Chromium's own bug tracker, three different Adobe products,
   and dedicated POS/receipt-printer documentation) all describing the
   identical mechanism.
4. **(Paper size, alternative) Nothing in application code can force
   this at all when targeting a real printer,** regardless of driver
   configuration, and the actually-needed change is dropping the
   in-browser print-dialog approach entirely in favor of
   `--kiosk-printing` (or an equivalent silent-print approach) so there's
   no dialog left to show a mismatched size. This is a bigger decision —
   it reopens the "does the cashier see/interact with a print dialog at
   all" question that was explicitly decided earlier in this project — so
   I'm not treating it as a code fix to just apply, but flagging it as a
   real fallback if #3 turns out not to be viable at the accounting
   office (e.g. if IT can't or won't touch printer driver settings).

## Open questions for the user

- Does the accounting office's actual printer (and its OS-level driver)
  support adding a custom paper size at all? This determines whether
  hypothesis #3 is even reachable, or whether #4 becomes the real path.
- Is `--kiosk-printing` (or silent/default-printer printing generally)
  an acceptable trade-off if the paper-size negotiation turns out not to
  be fixable through the print dialog on real hardware? This would be a
  genuine re-decision, not an implementation detail.
- Can the Firefox timing symptom be checked specifically with the logo
  image temporarily removed from the print template? That single test
  would directly confirm or rule out hypothesis #1 without needing any
  further code changes first.
