import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    // Default stays "node" — fast, and correct for the pure-logic tests
    // that make up most of this suite (receipt.ts, currency.ts, etc.).
    // Component tests that need a DOM opt into jsdom individually via a
    // `// @vitest-environment jsdom` docblock at the top of the file
    // instead of paying jsdom's setup cost project-wide. See
    // fee-catalog-item-card.test.tsx for the pattern.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Vitest's own per-test budget, which defaults to 5000ms. It has to
    // sit above RTL's `asyncUtilTimeout` (5000ms, set in the setup file),
    // or a slow render kills the test before RTL can report *why* it was
    // waiting — a "test timed out" with no element name, instead of
    // "Unable to find an element with the text: ...".
    //
    // The headroom is for the jsdom page tests specifically. They mount
    // Mantine, a DataTable and a query client, and vitest runs files in
    // parallel, so on a 4-core machine several of them compete for the
    // event loop and a render that takes 300ms alone can take many times
    // that in a full run. This does not slow a passing run: a test that
    // finishes in 200ms still finishes in 200ms.
    testTimeout: 20000,
  },
});
