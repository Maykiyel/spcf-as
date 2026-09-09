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
    // `/reports/*` is admin-only server-side and 403s a cashier. This route
    // is not in pages.ts, so it cannot inherit the group's roles and
    // `ProtectedRoute` has nothing to read unless they are spelled here.
    expect(
      (routeAt("/reports/services-sold/:serviceId")?.handle as RouteHandle)
        ?.roles,
    ).toEqual(["admin"]);
  });

  it("leaves the transaction detail open to both roles", () => {
    // The counter-case, so the assertion above is read as a choice rather
    // than as how every sibling here happens to be configured: a cashier
    // looking up a receipt they issued is routine.
    expect(routeAt("/transactions/:controlId")?.handle).toBeUndefined();
  });
});
