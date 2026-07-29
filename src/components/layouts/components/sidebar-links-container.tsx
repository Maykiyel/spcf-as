// import { useAuth } from "@/contexts/auth.context";
import SidebarItem from "./sidebar-item";
import { Accordion, AppShell, Box, Divider, Stack } from "@mantine/core";
import { routePaths } from "@/config/path";
import { IconDashboardFilled } from "@tabler/icons-react";
import { adminLinks } from "@/config/sidebar-links";

const SidebarLinksContainer = () => {
  //   --- MIGHT BE USED LATER ON ---
  //   const { user, isLoading } = useAuth();

  //   const currentNavLinks = useMemo(() => {
  //     if (!user?.role) return [];

  //     if(user.role === "admin") {
  //       return adminLinks
  //      } else {
  //       return cashierLinks
  //      }
  //   }, []);

  return (
    <AppShell.Section grow px="md">
      <Box mt={20} mb={10}>
        <SidebarItem
          label="Dashboard"
          icon={IconDashboardFilled}
          to={routePaths.dashboard.getHref()}
        />
      </Box>
      <Divider w="100%" color="rgba(0,0,0,0.2)" />
      <Divider w="100%" color="rgba(255,255,255,0.1)" />
      <Accordion>
        <Stack mt={10} gap={0} style={{ whiteSpace: "nowrap" }}>
          {/* {isLoading ? (
          <>
            <Skeleton height={30} radius="" />
            <Skeleton height={30} radius="" />
            <Skeleton height={30} radius="" />
          </>
        ) : (
          currentNavLinks.map((navLink, i) => (
            <SidebarLink
              key={i}
              label={navLink.label}
              to={navLink.to}
              icon={navLink.icon}
              collapsed={!desktopOpened}
            />
          ))
        )} */}

          {adminLinks.map((navLink, i) => (
            <SidebarItem
              key={i}
              collapsible={navLink.collapsible}
              label={navLink.label}
              to={navLink.to ?? ""}
              icon={navLink.icon}
            />
          ))}
        </Stack>
      </Accordion>
    </AppShell.Section>
  );
};

export default SidebarLinksContainer;
