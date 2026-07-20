import { AppShell, Card, Center, Flex, Group, Text } from "@mantine/core";
import AppSidebar from "./components/app-sidebar";
import { IconUserFilled } from "@tabler/icons-react";
import { useSidebarStore } from "@/stores/sidebar-store";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { mobileOpened, desktopOpened } = useSidebarStore();

  return (
    <AppShell
      p="lg"
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
      padding="md"
    >
      <AppShell.Header bg="dark" px="lg" withBorder={false}>
        <Group h="100%" align="center" px="md" justify="space-between">
          <Flex>
            <Card
              style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
              bg="rgba(255,255,255,0.1)"
              c="white"
              py={6}
              px={12}
            >
              <Center h="100%">
                <Text
                  size="xs"
                  fw={500}
                  c="rgba(255,255,255,0.6)"
                  tt="uppercase"
                >
                  Active School Year
                </Text>
              </Center>
            </Card>
            <Card
              style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
              bg="rgba(255,255,255,0.2)"
              c="white"
              py={6}
              px={12}
            >
              <Text size="sm" fw={500}>
                2026-2027
              </Text>
            </Card>
          </Flex>

          <Group>
            <Text fz={14} c="white">
              Placeholder Name
            </Text>
            <IconUserFilled color="white" />
          </Group>
        </Group>
      </AppShell.Header>
      <AppSidebar />
      <AppShell.Main pb={80}>{children}</AppShell.Main>
    </AppShell>
  );
};

export default AppLayout;
