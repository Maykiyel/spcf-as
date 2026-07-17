import type { SidebarSubItemProps } from "@/config/sidebar-links";
import { Accordion, Card, Flex, Stack, Text } from "@mantine/core";
import { IconChevronRight, type Icon } from "@tabler/icons-react";
import { Link, useLocation } from "react-router";
import SidebarSubItem from "./sidebar-sub-item";

interface SidebarLinkProps {
  label: string;
  icon: Icon;
  to: string;
  collapsed?: boolean;
  collapsible?: SidebarSubItemProps[];
}

const SidebarItem = ({
  label,
  icon: Icon,
  to,
  collapsible = [],
}: SidebarLinkProps) => {
  const { pathname } = useLocation();
  const isActive = to === pathname;

  return collapsible.length > 0 ? (
    <Accordion.Item
      value={label}
      bg="transparent"
      style={{ outline: "none", border: "none" }}
    >
      <Accordion.Control
        p={0}
        styles={{
          label: {
            padding: 0,
          },
        }}
        className="sidebar-collapsible"
        chevron={<></>}
        style={{
          backgroundColor: "transparent",
          color: "white",
          textDecoration: "none",
          border: 0,
        }}
      >
        <Flex px="xs" py="sm" justify="space-between" className="sidebar-item">
          <Flex align="center" gap={16}>
            <Icon size={20} />
            <Text size="sm">{label}</Text>
          </Flex>

          <IconChevronRight size={18} className="collapsible-chevron" />
        </Flex>
      </Accordion.Control>

      <Accordion.Panel
        pl="lg"
        styles={{
          content: {
            padding: 0,
          },
        }}
      >
        <Card
          bg="transparent"
          radius={0}
          px={6}
          py={0}
          style={{ borderLeft: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Stack gap={2}>
            {collapsible.map((item, i) => (
              <SidebarSubItem key={i} subItem={item} />
            ))}
          </Stack>
        </Card>
      </Accordion.Panel>
    </Accordion.Item>
  ) : (
    <Link style={{ color: "white", textDecoration: "none" }} to={to}>
      <Flex
        data-expanded={isActive}
        className="sidebar-item"
        px="xs"
        py="xs"
        align="center"
        gap={16}
      >
        <Icon size={20} />
        <Text size="sm">{label}</Text>
      </Flex>
    </Link>
  );
};

export default SidebarItem;
