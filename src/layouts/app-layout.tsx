import {
  AppShell,
  Card,
  Center,
  Flex,
  Group,
  Text,
  Menu,
  UnstyledButton,
} from "@mantine/core";
import { useNavigate } from "react-router";
import AppSidebar from "./components/app-sidebar";
import {
  IconUserFilled,
  IconLogout,
  IconChevronDown,
  IconHeartRateMonitor,
} from "@tabler/icons-react";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useAuthStore } from "@/stores/auth-store";
import { apiClient } from "@/lib/axios/api-client";
import { useQueryClient } from "@tanstack/react-query";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { mobileOpened, desktopOpened } = useSidebarStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.setUnauthenticated);
  const navigate = useNavigate();

  const handleLogOut = async () => {
    try {
      const res = await apiClient.post("/logout");

      if (res.success) {
        logout();
        queryClient.clear();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
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

          <Menu
            withArrow
            shadow="md"
            // transitionProps={{ transition: "skew-down" }}
            width={200}
            styles={{
              arrow: {
                borderColor: "rgba(255,255,255,0.3)",
              },
            }}
            radius={10}
            position="bottom-end"
            offset={6}
            arrowOffset={10}
          >
            <Menu.Target>
              <UnstyledButton pr={9} variant="transparent">
                <Group gap={6}>
                  <Text fz={14} c="white">
                    {user?.full_name ?? "Guest"}
                  </Text>
                  <IconUserFilled color="white" size={20} />
                  <IconChevronDown color="white" size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown
              bg="dark.7"
              styles={{
                dropdown: {
                  border: "1px solid rgba(0,0,0,0.1)",
                  boxShadow:
                    "inset 0 0 0 1px rgba(255,255,255,0.2), 0 2px 4px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1), 0 10px 24px rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              <Menu.Item
                className="dark-dropdown-item"
                leftSection={<IconHeartRateMonitor size={18} opacity={0.6} />}
                onClick={() => navigate("/temp")}
              >
                Activity Log
              </Menu.Item>
              <Menu.Divider mb={0} style={{ borderColor: "rgba(0,0,0,0.2)" }} />
              <Menu.Divider
                mt={0}
                style={{ borderColor: "rgba(255,255,255,0.15)" }}
              />
              <Menu.Item
                className="dark-dropdown-item danger"
                leftSection={<IconLogout size={18} opacity={0.6} />}
                color="danger"
                onClick={handleLogOut}
              >
                Log out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>
      <AppSidebar />
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};

export default AppLayout;
