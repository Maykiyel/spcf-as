import { AppShell, Group } from "@mantine/core";
import AppSidebar from "./components/app-sidebar";
import SchoolYearBadge from "./components/school-year-badge";
import UserMenu from "./components/user-menu";
import { useSidebarStore } from "@/stores/sidebar-store";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { mobileOpened, desktopOpened } = useSidebarStore();

  return (
    <AppShell
      bg="lightBackground"
      layout="alt"
      header={{ height: 60 }}
      navbar={{
        width: desktopOpened ? 280 : 70,
        breakpoint: "sm",
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
          <SchoolYearBadge />
          <UserMenu />
        </Group>
      </AppShell.Header>
      <AppSidebar />
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};

export default AppLayout;
