import { Center, Flex, Text } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import { Link, useLocation } from "react-router";
import { AppTooltip } from "@/components/ui/tooltip";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useSidebarExpanded } from "../use-sidebar-expanded";

type SidebarItemSimpleProps = {
  label: string;
  icon: Icon;
  to: string;
};

function SidebarItemSimple({ label, icon: Icon, to }: SidebarItemSimpleProps) {
  const { closeMobile } = useSidebarStore();
  const expanded = useSidebarExpanded();
  const { pathname } = useLocation();
  const isActive = to === pathname;

  return (
    <AppTooltip disabled={expanded} position="right" label={label}>
      <Link
        style={{ color: "white", textDecoration: "none" }}
        to={to}
        onClick={closeMobile}
      >
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
            className={["sidebar-link", !expanded ? "hidden" : ""].join(" ")}
          >
            {label}
          </Text>
        </Flex>
      </Link>
    </AppTooltip>
  );
}

export default SidebarItemSimple;
