import type { SidebarSubItemProps } from "@/config/sidebar-links";
import { Flex, Text, UnstyledButton } from "@mantine/core";
import { Link } from "react-router";

const SidebarSubItem = ({ subItem }: { subItem: SidebarSubItemProps }) => {
  const content = (
    <Flex align="center" gap={12} wrap="wrap">
      <div style={{ display: "flex", alignItems: "center" }}>
        <subItem.icon size={18} />
      </div>
      <Text fz={13} style={{ whiteSpace: "normal", flex: 1 }}>
        {subItem.label}
      </Text>
    </Flex>
  );

  return subItem.to ? (
    <UnstyledButton
      component={Link}
      to={subItem.to}
      className="sidebar-sub-item"
    >
      {content}
    </UnstyledButton>
  ) : (
    <UnstyledButton className="sidebar-sub-item">{content}</UnstyledButton>
  );
};

export default SidebarSubItem;
