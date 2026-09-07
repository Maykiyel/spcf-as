import { describe, it, expect } from "vitest";
import { IconEye, type Icon } from "@tabler/icons-react";
import {
  getLeafRoutes,
  getVisiblePages,
  isPageGroup,
  pages,
  type PageGroup,
  type PageLeaf,
  type TopLevelPage,
} from "./pages";
import type { Role } from "@/features/auth/types";

// Seam: the two resolution functions the router and the sidebar derive
// from, as a pure unit. Every precedence case runs against a fixture
// registry rather than the real one, so the rules stay readable and a
// later regrouping of the app's own navigation doesn't rewrite them.
//
// The real `pages` array is asserted once at the bottom, and only for the
// thing #67 actually changed: New Transaction is cashier-only.

function leaf(key: string, roles?: Role[]): PageLeaf {
  return {
    key,
    path: `/${key}`,
    lazyImport: () => Promise.resolve({ Component: () => null }),
    label: key,
    icon: IconEye as Icon,
    roles,
  };
}

function group(key: string, roles: Role[] | undefined, children: PageLeaf[]): PageGroup {
  return { key, label: key, icon: IconEye as Icon, roles, children };
}

const keysOf = (entries: TopLevelPage[]) => entries.map((entry) => entry.key);

function childKeysOf(entries: TopLevelPage[], groupKey: string): string[] {
  const found = entries.find((entry) => entry.key === groupKey);
  if (!found || !isPageGroup(found)) return [];
  return found.children.map((child) => child.key);
}

describe("getLeafRoutes — role resolution", () => {
  it("gives a leaf its group's roles when it declares none", () => {
    const registry = [group("g", ["admin"], [leaf("inherits")])];

    expect(getLeafRoutes(registry)).toMatchObject([
      { key: "inherits", roles: ["admin"] },
    ]);
  });

  it("lets a leaf's own roles override its group's", () => {
    const registry = [group("g", ["admin"], [leaf("own", ["cashier"])])];

    expect(getLeafRoutes(registry)).toMatchObject([
      { key: "own", roles: ["cashier"] },
    ]);
  });

  it("leaves a leaf unrestricted when neither it nor its group declares roles", () => {
    const registry = [group("g", undefined, [leaf("open")])];

    expect(getLeafRoutes(registry)[0].roles).toBeUndefined();
  });

  it("keeps a standalone leaf's own roles", () => {
    expect(getLeafRoutes([leaf("standalone", ["admin"])])).toMatchObject([
      { key: "standalone", roles: ["admin"] },
    ]);
  });
});

describe("getVisiblePages — what a role sees", () => {
  const registry = [
    leaf("dashboard"),
    group("transactions", undefined, [
      leaf("new", ["cashier"]),
      leaf("receipts"),
    ]),
    group("accounts", ["admin"], [leaf("manage")]),
  ];

  it("hides a leaf restricted to the other role", () => {
    expect(childKeysOf(getVisiblePages("admin", registry), "transactions")).toEqual([
      "receipts",
    ]);
  });

  it("shows that leaf to the role it names", () => {
    expect(childKeysOf(getVisiblePages("cashier", registry), "transactions")).toEqual([
      "new",
      "receipts",
    ]);
  });

  it("keeps the group's other children visible to both roles", () => {
    expect(childKeysOf(getVisiblePages("admin", registry), "transactions")).toContain(
      "receipts",
    );
    expect(childKeysOf(getVisiblePages("cashier", registry), "transactions")).toContain(
      "receipts",
    );
  });

  it("drops a group whose children a role can all reach nothing of", () => {
    expect(keysOf(getVisiblePages("cashier", registry))).not.toContain("accounts");
    expect(keysOf(getVisiblePages("admin", registry))).toContain("accounts");
  });

  it("drops a group left empty even when the group itself is unrestricted", () => {
    const allRestricted = [group("g", undefined, [leaf("a", ["admin"])])];

    expect(getVisiblePages("cashier", allRestricted)).toEqual([]);
  });

  it("hides a restricted standalone leaf and keeps an unrestricted one", () => {
    const standalone = [leaf("open"), leaf("adminOnly", ["admin"])];

    expect(keysOf(getVisiblePages("cashier", standalone))).toEqual(["open"]);
  });

  it("shows a user with no role only what nothing restricts", () => {
    expect(keysOf(getVisiblePages(undefined, registry))).toEqual([
      "dashboard",
      "transactions",
    ]);
    expect(childKeysOf(getVisiblePages(undefined, registry), "transactions")).toEqual([
      "receipts",
    ]);
  });
});

describe("the app's own registry", () => {
  it("restricts New Transaction to cashiers without touching the rest of its group", () => {
    const routes = getLeafRoutes();
    const byPath = (path: string) => routes.find((route) => route.path === path);

    expect(byPath("/transactions/new")?.roles).toEqual(["cashier"]);
    expect(byPath("/transactions/receipts")?.roles).toBeUndefined();
    expect(byPath("/transactions/itemized")?.roles).toBeUndefined();
  });

  it("still hides the whole Accounts group from a cashier", () => {
    expect(keysOf(getVisiblePages("cashier", pages))).not.toContain("accounts");
  });
});
