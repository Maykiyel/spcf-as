import { Divider } from "@mantine/core";
import { useTableFilters } from "@/components/ui/data-table";
import {
  UserAccountRoleFilter,
  UserAccountStatusFilter,
} from "./user-account-filters";

/** `role` and `is_active`, the only two filters `/users` allows. A panel
 * rather than two inline bindings on the page, so every filter in the app
 * reaches its table the same way. */
export function UserAccountFilterPanel() {
  const filter = useTableFilters();

  return (
    <>
      <UserAccountRoleFilter {...filter("role")} />
      <Divider orientation="vertical" visibleFrom="xs" />
      <UserAccountStatusFilter {...filter("is_active")} />
    </>
  );
}
