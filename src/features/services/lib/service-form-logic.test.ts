import { describe, it, expect } from "vitest";
import { buildCreatePayload, didItemCodeChange } from "./service-form-logic";

const fields = { name: "SHS FEE", price: 100, description: "" };

describe("buildCreatePayload", () => {
  it("sends item_code_id for an existing selection", () => {
    const payload = buildCreatePayload(fields, {
      kind: "existing",
      id: 5,
      name: "GRADUATION FEE",
    });
    expect(payload).toEqual({ ...fields, item_code_id: 5 });
  });

  it("sends item_code_name for a new selection", () => {
    const payload = buildCreatePayload(fields, {
      kind: "new",
      name: "NEW ITEM CODE",
    });
    expect(payload).toEqual({ ...fields, item_code_name: "NEW ITEM CODE" });
  });
});

describe("didItemCodeChange", () => {
  it("false when nothing selected yet", () => {
    expect(didItemCodeChange(null, { id: 1 })).toBe(false);
  });

  it("false when there's no original to compare against", () => {
    expect(
      didItemCodeChange({ kind: "existing", id: 1, name: "X" }, null),
    ).toBe(false);
  });

  it("false when the selection matches the original", () => {
    expect(
      didItemCodeChange({ kind: "existing", id: 1, name: "X" }, { id: 1 }),
    ).toBe(false);
  });

  it("true when the selection differs from the original", () => {
    expect(
      didItemCodeChange({ kind: "existing", id: 2, name: "Y" }, { id: 1 }),
    ).toBe(true);
  });
});
