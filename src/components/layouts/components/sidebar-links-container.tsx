import { useMemo } from "react";
import { SidebarItem } from "./sidebar-item";
import { Accordion, AppShell, Box, Divider, Stack } from "@mantine/core";
import { pages, isPageGroup } from "@/config/pages";
import { useAuthStore } from "@/stores/auth-store";

const SidebarLinksContainer = () => {
  const role = useAuthStore((s) => s.user?.role);

  const visiblePages = useMemo(
    () => pages.filter((p) => !p.roles || (role && p.roles.includes(role))),
    [role],
  );

  // Dashboard is always pages[0] and never a group — rendered separately so
  // it keeps its own spacing/divider placement; everything else lives in
  // the Accordion below.
  const [dashboard, ...rest] = visiblePages;

  return (
    <AppShell.Section grow px="md">
      {dashboard && !isPageGroup(dashboard) && (
        <Box mt={20} mb={10}>
          <SidebarItem.Simple
            label={dashboard.label}
            icon={dashboard.icon}
            to={dashboard.path}
          />
        </Box>
      )}
      <Divider w="100%" color="rgba(0,0,0,0.2)" />
      <Divider w="100%" color="rgba(255,255,255,0.1)" />
      <Accordion>
        <Stack mt={10} gap={0} style={{ whiteSpace: "nowrap" }}>
          {rest.map((page) =>
            isPageGroup(page) ? (
              <SidebarItem.Collapsible
                key={page.key}
                label={page.label}
                icon={page.icon}
                collapsible={page.children}
              />
            ) : (
              <SidebarItem.Simple
                key={page.key}
                label={page.label}
                icon={page.icon}
                to={page.path}
              />
            ),
          )}
        </Stack>
      </Accordion>
    </AppShell.Section>
  );
};

export default SidebarLinksContainer;
