import { describe, it, expect } from "vitest";
import { activityAreaTone } from "./activity-area-tone";

describe("activityAreaTone", () => {
  it.each([
    ["Transaction - Void", "primary"],
    ["Service - Updated", "tertiary"],
    ["Series Receipt - Exhausted", "warning"],
    ["Account - Deactivated", "accent"],
  ])("colours a known %s prefix", (type, tone) => {
    expect(activityAreaTone(type)).toBe(tone);
  });

  it("falls back to neutral for a well-formed type with an unrecognised prefix", () => {
    expect(activityAreaTone("Report - Generated")).toBe("neutral");
  });

  it("falls back to neutral for a string with no separator", () => {
    expect(activityAreaTone("SomethingWithNoSeparator")).toBe("neutral");
  });

  it("falls back to neutral for an empty string", () => {
    expect(activityAreaTone("")).toBe("neutral");
  });

  it("never returns danger, since the log groups by area rather than rating a row", () => {
    const inputs = ["Transaction - Void", "Report - Generated", "", "x"];
    for (const type of inputs) {
      expect(activityAreaTone(type)).not.toBe("danger");
    }
  });
});
