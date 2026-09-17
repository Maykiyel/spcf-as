import { AppShell, Group, Overlay } from "@mantine/core";
import AppSidebar from "./components/app-sidebar";
import SchoolYearBadge from "./components/school-year-badge";
import SidebarBurger from "./components/sidebar-burger";
import UserMenu from "./components/user-menu";
import { useSidebarStore } from "@/stores/sidebar-store";
import { SIDEBAR_BREAKPOINT, useSidebarExpanded } from "./use-sidebar-expanded";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { mobileOpened, closeMobile } = useSidebarStore();
  const sidebarWidth = useSidebarExpanded() ? 280 : 70;

  return (
    <AppShell
      bg="lightBackground"
      style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
      layout="alt"
      header={{ height: 60 }}
      navbar={{
        width: sidebarWidth,
        breakpoint: SIDEBAR_BREAKPOINT,
        collapsed: { mobile: !mobileOpened },
      }}
      styles={{
        navbar: {
          transition: "width 200ms ease, min-width 200ms ease",
        },
        main: {
          transition: "padding-left 300ms ease",
        },
      }}
      padding="lg"
    >
      <AppShell.Header bg="dark" px="lg" withBorder={false}>
        <Group h="100%" align="center" px="md" justify="space-between">
          <Group gap="sm" align="center" wrap="nowrap">
            <SidebarBurger />
            <SchoolYearBadge />
          </Group>
          <UserMenu />
        </Group>
      </AppShell.Header>
      {mobileOpened && (
        // Under the header (100) so the account dropdown stays usable, and
        // under the navbar, which Mantine renders at 101. `hiddenFrom`
        // covers a resize past the breakpoint with the flag still set.
        <Overlay
          fixed
          hiddenFrom="sm"
          zIndex={99}
          backgroundOpacity={0.5}
          onClick={closeMobile}
        />
      )}
      <AppSidebar />
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};

export default AppLayout;
