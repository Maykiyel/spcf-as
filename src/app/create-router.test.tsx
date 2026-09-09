// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import type { RouteObject } from "react-router";
import { createRouter } from "./create-router";
import type { Role } from "@/features/auth/types";

type RouteHandle = { roles?: Role[] };

function flatten(routes: RouteObject[]): RouteObject[] {
  return routes.flatMap((route) => [
    route,
    ...flatten((route.children ?? []) as RouteObject[]),
  ]);
}

const routeAt = (path: string) =>
  flatten(createRouter().routes as RouteObject[]).find(
    (route) => route.path === path,
  );

describe("createRouter — routes with no sidebar entry", () => {
  it("gates the services-sold breakdown on admin, as its own leaf does", () => {
    // Not in pages.ts, so it inherits no group roles: unless they are
    // spelled here, `ProtectedRoute` has nothing to read.
    expect(
      (routeAt("/reports/services-sold/:serviceId")?.handle as RouteHandle)
        ?.roles,
    ).toEqual(["admin"]);
  });

  it("leaves the transaction detail open to both roles", () => {
    // The counter-case, so the assertion above reads as a choice.
    expect(routeAt("/transactions/:controlId")?.handle).toBeUndefined();
  });
});
