import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

// setupFiles runs for every test file regardless of environment — most of
// this suite runs on the fast "node" environment (see vitest.config.ts),
// where `window` doesn't exist at all. Everything below is DOM-only, so it
// has to be skipped entirely for node-environment files rather than just
// "not error" — referencing `window` unconditionally at module scope
// would throw a ReferenceError before any test even runs.
if (typeof window !== "undefined") {
  // jsdom doesn't implement window.matchMedia — Mantine's color-scheme
  // detection (MantineProvider) calls it on mount, so without this every
  // jsdom test rendering any Mantine component fails with
  // "window.matchMedia is not a function" before it even gets to the
  // component under test. A known jsdom gap, not a jsdom bug: matchMedia
  // depends on actual browser layout/media capabilities jsdom doesn't
  // implement, so it's left for consumers to stub.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated, some libraries still call it
      removeListener: vi.fn(), // deprecated, some libraries still call it
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  // This project doesn't use vitest's `globals: true` (tests import
  // describe/it/expect explicitly — see any existing *.test.ts), so RTL's
  // auto-cleanup-on-afterEach-detection doesn't fire automatically either.
  // Without this, a component left mounted by one test would still be in
  // the jsdom document when the next test's render() runs, causing
  // cross-test pollution (duplicate elements, stale event listeners).
  // Dynamic import, not a top-level one: importing "@testing-library/react"
  // pulls in DOM-dependent code that node-environment test files should
  // never have to load at all.
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => {
    cleanup();
  });
}
