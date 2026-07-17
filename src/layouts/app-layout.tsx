import { AppShell, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import AppSidebar from "./components/app-sidebar";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [opened] = useDisclosure(true);

  return (
    <AppShell
      p="lg"
      bg="lightBackground"
      layout="alt"
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      styles={{
        navbar: {
          transition: "width 200ms ease, min-width 200ms ease",
        },
        main: {
          transition: "padding-left 300ms ease",
        },
      }}
      padding="md"
    >
      <AppShell.Header bg="#3a3b45" px="lg" withBorder={false}>
        <Group h="100%" px="md" justify="space-between">
          {/* <UserProfile /> */}
        </Group>
      </AppShell.Header>
      <AppSidebar />
      <AppShell.Main pb={80}>{children}</AppShell.Main>
    </AppShell>
  );
};

export default AppLayout;
