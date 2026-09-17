import type { PageLeaf } from "@/config/pages";
import { Flex, Text, UnstyledButton } from "@mantine/core";
import { Link } from "react-router";
import { useSidebarStore } from "@/stores/sidebar-store";

const SidebarSubItem = ({ subItem }: { subItem: PageLeaf }) => {
  const { closeMobile } = useSidebarStore();

  return (
    <UnstyledButton
      component={Link}
      to={subItem.path}
      className="sidebar-sub-item"
      onClick={closeMobile}
    >
      <Flex align="center" gap={12} wrap="wrap">
        <div style={{ display: "flex", alignItems: "center" }}>
          <subItem.icon size={18} />
        </div>
        <Text fz={13} style={{ whiteSpace: "normal", flex: 1 }}>
          {subItem.label}
        </Text>
      </Flex>
    </UnstyledButton>
  );
};

export default SidebarSubItem;
