import { Center, Flex, Text } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import { Link, useLocation } from "react-router";
import AppTooltip from "./app-tooltip";
import { useSidebarStore } from "@/stores/sidebar-store";

type SidebarItemSimpleProps = {
  label: string;
  icon: Icon;
  to?: string;
};

function SidebarItemSimple({
  label,
  icon: Icon,
  to = "",
}: SidebarItemSimpleProps) {
  const { desktopOpened } = useSidebarStore();
  const { pathname } = useLocation();
  const isActive = to === pathname;

  return (
    <AppTooltip disabled={desktopOpened} position="right" label={label}>
      <Link style={{ color: "white", textDecoration: "none" }} to={to}>
        <Flex
          data-expanded={isActive}
          className={isActive ? "" : "sidebar-item"}
          px="xs"
          py="xs"
          align="center"
          gap={16}
        >
          <Center>
            <Icon size={20} />
          </Center>
          <Text
            fz={14}
            className={["sidebar-link", !desktopOpened ? "hidden" : ""].join(
              " ",
            )}
          >
            {label}
          </Text>
        </Flex>
      </Link>
    </AppTooltip>
  );
}

export default SidebarItemSimple;
