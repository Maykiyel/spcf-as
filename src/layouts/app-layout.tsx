import { AppShell, Card, Center, Flex, Group, Text, Menu, UnstyledButton } from "@mantine/core";
import { useNavigate } from "react-router";
import AppSidebar from "./components/app-sidebar";
import { IconUserFilled, IconHistory, IconLogout, IconChevronDown } from "@tabler/icons-react";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useAuthStore } from "@/stores/auth-store";
import { routePaths } from "@/config/path";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { mobileOpened, desktopOpened } = useSidebarStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(routePaths.auth.login.path);
  };

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

          <Menu shadow="md" width={200} position="bottom-end" offset={8}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap={6}>
                  <Text fz={14} c="white">
                    {user?.full_name ?? "Guest"}
                  </Text>
                  <IconUserFilled color="white" size={20} />
                  <IconChevronDown color="white" size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconHistory size={16} />}
                onClick={() => navigate('/temp')}
              >
                Activity Log
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconLogout size={16} />}
                color="danger"
                onClick={handleLogout}
              >
                Log out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>
      <AppSidebar />
      <AppShell.Main pb={80}>{children}</AppShell.Main>
    </AppShell>
  );
};

export default AppLayout;