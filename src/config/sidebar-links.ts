import {
  IconArrowBackUp,
  IconDeviceDesktopFilled,
  IconDeviceHeartMonitorFilled,
  IconEye,
  IconKeyFilled,
  IconPlus,
  IconReceiptDollarFilled,
  IconReceiptFilled,
  IconSchoolFilled,
  IconTruckFilled,
  IconUserFilled,
  IconXFilled,
  type Icon,
} from "@tabler/icons-react";
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
}

// EITHER WE USE SEPARATE LINKS ARRAY BY ROLE
// OR WE WILL BE ADDING "forAdmin" PROPERTY IN EACH ITEM.
// ALSO, ALL LINKS SHOULD BE CHANGED TO CONFIG VERSION. THEY ARE PLACEHOLDERS FOR NOW.

export const cashierLinks: SidebarItem[] = [
  {
    icon: IconReceiptFilled,
    label: "Transactions",
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
  },
  {
    icon: IconSchoolFilled,
    label: "Students",
    collapsible: [
      {
        label: "Add / Import Students",
        icon: IconPlus,
        actionType: "modal",
        actionKey: "ADD_STUDENT",
      },
      {
        label: "Uploads",
        icon: IconEye,
        to: "/transactions/receipts",
      },
    ],
  },
];

export const adminLinks: SidebarItem[] = [
  {
    label: "Inventory",
    icon: IconDeviceDesktopFilled,
    to: routePaths.inventory.path,
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
  },
  {
    label: "Void",
    icon: IconKeyFilled,
    collapsible: [
      {
        label: "Void Item",
        icon: IconXFilled,
        to: "/placeholder",
      },
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
      {
        label: "Uploads",
        icon: IconEye,
        to: "/transactions/receipts",
      },
    ],
  },
  {
    label: "Payables",
    icon: IconReceiptDollarFilled,
    collapsible: [
      {
        label: "Classify Payables per Department",
        icon: IconEye,
        actionType: "modal",
        actionKey: "ADD_STUDENT",
      },
      {
        label: "Detailed Report of Receivables",
        icon: IconEye,
        to: "/transactions/receipts",
      },
    ],
  },
  {
    label: "Supplier",
    icon: IconTruckFilled,
    to: "/suppliers",
  },
  {
    label: "Accounts",
    icon: IconUserFilled,
    to: "/supplier",
  },
  {
    label: "Activity Log",
    icon: IconDeviceHeartMonitorFilled,
    to: "/history",
  },
];
