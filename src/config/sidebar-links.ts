import {
  IconArrowBackUp,
  IconDeviceDesktopFilled,
  IconDeviceHeartMonitorFilled,
  IconEye,
  IconKeyFilled,
  IconPlus,
  IconReceiptFilled,
  IconSchoolFilled,
  IconUserFilled,
  IconXFilled,
  type Icon,
} from "@tabler/icons-react";
import type { Role } from "@/features/auth/types";
import { routePaths } from "./path";

export interface SidebarSubItemProps {
  label: string;
  icon: Icon;
  to?: string;
  actionType?: "modal" | "custom";
  actionKey?: string;
}

export interface SidebarItem {
  label: string;
  icon: Icon;
  to?: string;
  collapsible?: SidebarSubItemProps[];
  roles?: Role[]; // undefined = visible to everyone
}

export const sidebarLinks: SidebarItem[] = [
  {
    label: "Inventory",
    icon: IconDeviceDesktopFilled,
    to: routePaths.inventory.path,
    roles: ["admin"],
  },
  {
    label: "Transactions",
    icon: IconReceiptFilled,
    collapsible: [
      {
        label: "Add Transaction",
        icon: IconPlus,
        actionType: "modal",
        actionKey: "ADD_TRANSACTION",
      },
      {
        label: "View Transactions (Per Receipt)",
        icon: IconEye,
        to: "/transactions/receipts",
      },
      {
        label: "View Transactions (Itemized List)",
        icon: IconEye,
        to: "/transactions/itemized",
      },
    ],
    // no roles — shared by both admin and cashier, per the old parallel arrays
  },
  {
    label: "Void",
    icon: IconKeyFilled,
    roles: ["admin"],
    collapsible: [
      { label: "Void Item", icon: IconXFilled, to: "/placeholder" },
      {
        label: "Cancel / Return Transaction",
        icon: IconArrowBackUp,
        to: "/placeholder",
      },
    ],
  },
  {
    label: "Students",
    icon: IconSchoolFilled,
    collapsible: [
      {
        label: "Add / Import Students",
        icon: IconPlus,
        actionType: "modal",
        actionKey: "ADD_STUDENT",
      },
      { label: "Uploads", icon: IconEye, to: "/transactions/receipts" },
    ],
    // no roles — shared, per the old parallel arrays
  },
  {
    label: "Accounts",
    icon: IconUserFilled,
    to: "/supplier",
    roles: ["admin"],
  },
  {
    label: "Activity Log",
    icon: IconDeviceHeartMonitorFilled,
    to: "/history",
    roles: ["admin"],
  },
];
