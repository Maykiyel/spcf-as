import { Group, Menu, Text, UnstyledButton } from "@mantine/core";
import {
  IconUserFilled,
  IconLogout,
  IconChevronDown,
  IconHeartRateMonitor,
} from "@tabler/icons-react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { authSession } from "@/features/auth/session";

function UserMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const handleLogOut = async () => {
    await authSession.logout();
    queryClient.clear();
  };

  return (
    <Menu
      withArrow
      shadow="md"
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
  );
}

export default UserMenu;
