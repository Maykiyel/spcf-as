import type { Tone } from "@/components/ui/status-badge";

/** The wire sends `type` as an already-formatted display string
 * ("Transaction - Void"), not a code, and offers no enumeration the
 * frontend can be warned against. See CONTEXT.md's **Area**. */
const AREA_TONE: Record<string, Tone> = {
  Transaction: "primary",
  Service: "tertiary",
  "Series Receipt": "warning",
  Account: "accent",
};

const SEPARATOR = " - ";

/** An unrecognised prefix, no separator and an empty string all fall back
 * to `neutral` rather than throwing, so the log never breaks on a type this
 * frontend has never seen. `danger` never appears here. */
export function activityAreaTone(type: string): Tone {
  const separatorIndex = type.indexOf(SEPARATOR);
  if (separatorIndex === -1) return "neutral";
  const prefix = type.slice(0, separatorIndex);
  return AREA_TONE[prefix] ?? "neutral";
}
