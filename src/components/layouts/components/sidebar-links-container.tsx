import { useMemo } from "react";
import { SidebarItem } from "./sidebar-item";
import { Accordion, AppShell, Box, Divider, Stack } from "@mantine/core";
import { routePaths } from "@/config/path";
import { IconDashboardFilled } from "@tabler/icons-react";
import { sidebarLinks } from "@/config/sidebar-links";
import { useAuthStore } from "@/stores/auth-store";

const SidebarLinksContainer = () => {
  const role = useAuthStore((s) => s.user?.role);

  const visibleLinks = useMemo(
    () =>
      sidebarLinks.filter(
        (link) => !link.roles || (role && link.roles.includes(role)),
      ),
    [role],
  );

  return (
    <AppShell.Section grow px="md">
      <Box mt={20} mb={10}>
        <SidebarItem.Simple
          label="Dashboard"
          icon={IconDashboardFilled}
          to={routePaths.dashboard.getHref()}
        />
      </Box>
      <Divider w="100%" color="rgba(0,0,0,0.2)" />
      <Divider w="100%" color="rgba(255,255,255,0.1)" />
      <Accordion>
        <Stack mt={10} gap={0} style={{ whiteSpace: "nowrap" }}>
          {visibleLinks.map((link) =>
            link.collapsible?.length ? (
              <SidebarItem.Collapsible
                key={link.label}
                label={link.label}
                icon={link.icon}
                collapsible={link.collapsible}
              />
            ) : (
              <SidebarItem.Simple
                key={link.label}
                label={link.label}
                icon={link.icon}
                to={link.to}
              />
            ),
          )}
        </Stack>
      </Accordion>
    </AppShell.Section>
  );
};

export default SidebarLinksContainer;
