import type { ComponentType } from "react";
import {
  IconClockHour4Filled,
  IconDashboardFilled,
  IconDeviceDesktopFilled,
  IconEye,
  IconKeyFilled,
  IconPlus,
  IconReceiptFilled,
  IconReportAnalytics,
  IconUserCog,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";
import type { Role } from "@/features/auth/types";

// Not part of the pages array below — it has no sidebar presence and
// renders outside AppLayout/ProtectedRoute entirely.
export const LOGIN_PATH = "/";

export const DASHBOARD_PATH = "/dashboard";

export type PageLeaf = {
  key: string;
  path: string;
  lazyImport: () => Promise<{ Component: ComponentType }>;
  label: string;
  icon: Icon;
  /** Who may reach this page. Undefined means "inherit" — its group's
   * roles for a leaf inside one, everyone for a standalone leaf.
   *
   * A leaf that declares its own roles **overrides** its group's rather
   * than intersecting with them: the more specific declaration wins,
   * which is the rule any cascade already trains people to expect. An
   * intersecting rule — a leaf may only narrow, never widen — is safer in
   * the abstract, but every case here narrows, so the two behave
   * identically while intersection is harder to reason about. */
  roles?: Role[];
};

export type PageGroup = {
  key: string;
  label: string;
  icon: Icon;
  roles?: Role[]; // undefined = visible to everyone
  children: PageLeaf[];
};

export type TopLevelPage = PageLeaf | PageGroup;

export function isPageGroup(entry: TopLevelPage): entry is PageGroup {
  return "children" in entry;
}

// The one place the leaf-overrides-group rule lives. Both derivations
// below call it, which is what stops a hidden sidebar link and a
// reachable route disagreeing.
function resolveLeafRoles(
  leaf: PageLeaf,
  group?: PageGroup,
): Role[] | undefined {
  return leaf.roles ?? group?.roles;
}

// Undeclared roles mean everyone. A declared list needs a signed-in role
// that is on it — a user with no role at all matches nothing.
function isAllowedForRole(
  roles: Role[] | undefined,
  role: Role | undefined,
): boolean {
  return !roles || (role !== undefined && roles.includes(role));
}

// Every navigable leaf with its required roles resolved. This is the
// router's source for role-gating a direct navigation, the same way
// `getVisiblePages` below is the sidebar's — both resolve through
// `resolveLeafRoles`, so neither can drift from the other.
export function getLeafRoutes(entries: TopLevelPage[] = pages): PageLeaf[] {
  return entries.flatMap((entry) =>
    isPageGroup(entry)
      ? entry.children.map((child) => ({
          ...child,
          roles: resolveLeafRoles(child, entry),
        }))
      : [entry],
  );
}

// The navigation tree `role` may actually use: standalone leaves they can
// reach, and groups reduced to the children they can reach.
//
// A group is not filtered on its own `roles` directly — it doesn't need
// to be. A child with no roles of its own inherits the group's, so an
// admin-only group whose children declare nothing loses every child for a
// cashier and drops out here on the emptiness rule below. Filtering the
// group separately would be a second rule saying the same thing, free to
// disagree with the router the moment a leaf overrides its group.
//
// **An empty group is dropped entirely.** An expandable group that opens
// onto nothing is worse than no group at all.
//
// This is presentation, not security: `ProtectedRoute` is the enforcement
// point in the client and the server enforces independently. Nothing here
// should be relied on as an access control boundary.
export function getVisiblePages(
  role: Role | undefined,
  entries: TopLevelPage[] = pages,
): TopLevelPage[] {
  // The explicit type argument matters: inference takes the first branch's
  // `PageLeaf[]` and then rejects the group branch against it.
  return entries.flatMap<TopLevelPage>((entry) => {
    if (!isPageGroup(entry)) {
      return isAllowedForRole(entry.roles, role) ? [entry] : [];
    }

    const children = entry.children.filter((child) =>
      isAllowedForRole(resolveLeafRoles(child, entry), role),
    );

    return children.length > 0 ? [{ ...entry, children }] : [];
  });
}

// The single source of truth for every page in the app shell. The router
// and the sidebar both derive from this array — adding, removing, or
// regrouping a page is an edit here, nowhere else.
export const pages: TopLevelPage[] = [
  {
    key: "dashboard",
    path: DASHBOARD_PATH,
    lazyImport: () => import("@/app/routes/app/dashboard"),
    label: "Dashboard",
    icon: IconDashboardFilled,
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: IconDeviceDesktopFilled,
    roles: ["admin", "cashier"],
    children: [
      {
        key: "services",
        path: "/inventory/services",
        lazyImport: () => import("@/app/routes/app/inventory/services"),
        label: "Services",
        icon: IconEye,
      },
      {
        key: "itemCodes",
        path: "/inventory/item-codes",
        lazyImport: () => import("@/app/routes/app/inventory/item-codes"),
        label: "Item Codes",
        icon: IconEye,
      },
    ],
  },
  {
    key: "transactions",
    label: "Transactions",
    icon: IconReceiptFilled,
    // no roles — shared by both admin and cashier
    children: [
      {
        // Cashier-only, overriding the group. Taking a payment requires an
        // active series receipt, which admins don't hold — the server
        // refuses `POST /transactions` from an admin outright, so the page
        // is a dead end for them rather than a workflow. The other two
        // pages in this group stay shared: a cashier looking up a receipt
        // they issued is routine, and the server already restricts them to
        // their own rows.
        key: "newTransaction",
        path: "/transactions/new",
        lazyImport: () => import("@/app/routes/app/transactions/new"),
        label: "New Transaction",
        icon: IconPlus,
        roles: ["cashier"],
      },
      {
        key: "transactionsReceipts",
        path: "/transactions/receipts",
        lazyImport: () => import("@/app/routes/app/transactions/receipts"),
        label: "View Transactions (Per Receipt)",
        icon: IconEye,
      },
      {
        key: "transactionsItemized",
        path: "/transactions/itemized",
        lazyImport: () => import("@/app/routes/app/transactions/itemized"),
        label: "View Transactions (Itemized List)",
        icon: IconEye,
      },
    ],
  },
  {
    key: "accounts",
    label: "Accounts",
    icon: IconUsersGroup,
    roles: ["admin"],
    children: [
      {
        key: "manageAccounts",
        path: "/accounts/manage",
        lazyImport: () => import("@/app/routes/app/accounts/manage"),
        label: "Manage Accounts",
        icon: IconUserCog,
      },
      {
        key: "seriesReceipts",
        path: "/accounts/series-receipts",
        lazyImport: () =>
          import("@/app/routes/app/accounts/series-receipts"),
        label: "Series Receipts",
        icon: IconEye,
      },
    ],
  },
  {
    key: "void",
    path: "/void",
    lazyImport: () => import("@/app/routes/app/void"),
    label: "Void",
    icon: IconKeyFilled,
    roles: ["admin"],
  },
  {
    key: "reports",
    path: "/reports",
    lazyImport: () => import("@/app/routes/app/reports"),
    label: "Reports",
    icon: IconReportAnalytics,
    roles: ["admin"],
  },
  {
    key: "activityLog",
    path: "/activity-log",
    lazyImport: () => import("@/app/routes/app/activity-log"),
    label: "Activity Log",
    icon: IconClockHour4Filled,
    roles: ["admin"],
  },
];
