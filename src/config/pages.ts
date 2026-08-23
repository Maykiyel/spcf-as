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
};

export type PageGroup = {
  key: string;
  label: string;
  icon: Icon;
  roles?: Role[]; // undefined = visible to everyone
  children: PageLeaf[];
};

export type TopLevelPage = (PageLeaf & { roles?: Role[] }) | PageGroup;

export function isPageGroup(entry: TopLevelPage): entry is PageGroup {
  return "children" in entry;
}

// Every navigable leaf with its required roles resolved — a group's
// `roles` apply to all of its children (mirroring the sidebar's own
// filtering in sidebar-links-container.tsx), a standalone leaf uses its
// own `roles`. This is the router's source for role-gating a direct
// navigation, the same way `pages` above is the sidebar's.
export function getLeafRoutes(
  entries: TopLevelPage[] = pages,
): (PageLeaf & { roles?: Role[] })[] {
  return entries.flatMap((entry) =>
    isPageGroup(entry)
      ? entry.children.map((child) => ({ ...child, roles: entry.roles }))
      : [entry],
  );
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
        key: "newTransaction",
        path: "/transactions/new",
        lazyImport: () => import("@/app/routes/app/transactions/new"),
        label: "New Transaction",
        icon: IconPlus,
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
