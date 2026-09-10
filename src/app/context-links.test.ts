import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * `CONTEXT.md`'s glossary links resolve.
 *
 * Nothing renders `[[...]]` and no tool reads this file, so a link left
 * behind by a renamed entry is invisible until someone reads closely.
 * `[[column-field-and-id]]` was broken by `37a2f05` and survived four
 * merged PRs that way.
 *
 * Lives in `app/` for the same reason `sort-plan-conformance.test.ts` does:
 * it spans the repo and no feature owns it.
 */
const CONTEXT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../CONTEXT.md"),
  "utf-8",
);

/** The convention the file already uses: `**Sort plan**` is `[[sort-plan]]`.
 * Backticks and punctuation drop out, so `Column \`field\`, \`id\` and
 * \`sortKey\`` is `[[column-field-id-and-sortkey]]`. */
const slugify = (term: string): string =>
  term
    .replace(/`/g, "")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const terms = [...CONTEXT.matchAll(/^\*\*(.+?)\*\*:/gm)].map((m) => m[1]);
const links = [...CONTEXT.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);

describe("CONTEXT.md's glossary links", () => {
  it("found the entries and the links to check", () => {
    // Guards the two patterns above rather than the file: if either stops
    // matching, the real assertion below passes over an empty list and
    // reports nothing wrong.
    expect(terms.length).toBeGreaterThan(20);
    expect(links.length).toBeGreaterThan(0);
  });

  it("points every link at an entry that exists", () => {
    const known = new Set(terms.map(slugify));

    expect(links.filter((link) => !known.has(link))).toEqual([]);
  });

  it("gives every entry a slug of its own", () => {
    // Two entries slugging to one name would let a link resolve to whichever
    // came first, which is the same silent wrong answer from the other end.
    const slugs = terms.map(slugify);

    expect(slugs).toEqual([...new Set(slugs)]);
  });
});
