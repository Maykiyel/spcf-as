import { Badge } from "@mantine/core";
import type { ColumnDef } from "@/components/ui/data-table";
import type { Role } from "@/features/auth/types";
import type { UserAccount } from "../types";
import { UserAccountActionsCell } from "./user-account-actions-cell";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  cashier: "Cashier",
};

/** Every sortable key here is one `USER_ACCOUNTS_SORT_PLAN` allow-lists. A
 * key it doesn't know is a 400 on the first header click, which is why
 * `username` is renamed at the fetcher rather than carrying `user_name`. */
export const userAccountColumns: ColumnDef<UserAccount>[] = [
  { field: "full_name", header: "Name" },
  { field: "username", header: "Username" },
  {
    field: "role",
    header: "Role",
    render: (row) => (
      <Badge
        color={row.role === "admin" ? "primary" : "tertiary"}
        variant="light"
      >
        {ROLE_LABEL[row.role]}
      </Badge>
    ),
  },
  {
    // No field: the badge reads `is_active`, but shows a word rather than
    // the raw `true`/`false`.
    id: "status",
    header: "Status",
    render: (row) => (
      <Badge color={row.is_active ? "success" : "danger"} variant="light">
        {row.is_active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    render: (row) => <UserAccountActionsCell account={row} />,
  },
];
