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
  },
});
