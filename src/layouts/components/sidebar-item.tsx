import type { SidebarSubItemProps } from "@/config/sidebar-links";
import {
  Accordion,
  Card,
  Center,
  Flex,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { IconChevronRight, type Icon } from "@tabler/icons-react";
import { Link, useLocation } from "react-router";
import SidebarSubItem from "./sidebar-sub-item";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useEffect, useState } from "react";
import AppTooltip from "./app-tooltip";

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
  const { desktopOpened } = useSidebarStore();
  const { pathname } = useLocation();
  const isActive = to === pathname;
  const [popoverOpened, setPopoverOpened] = useState(false);

  const hasSubItems = collapsible.length > 0;

  useEffect(() => {
    setPopoverOpened(false);
  }, [desktopOpened]);

  const subItemsContent = (
    <Stack gap={2}>
      {collapsible.map((item, i) => (
        <SidebarSubItem key={i} subItem={item} />
      ))}
    </Stack>
  );

  if (hasSubItems) {
    return (
      <Popover
        position="right-start"
        offset={5}
        withinPortal
        shadow="md"
        disabled={desktopOpened}
        opened={!desktopOpened && popoverOpened}
        onChange={setPopoverOpened}
        transitionProps={{ transition: "fade-right", duration: 150 }}
      >
        <AppTooltip disabled={desktopOpened} position="right" label={label}>
          <Popover.Target>
            <div
              onClick={() => {
                if (!desktopOpened) {
                  setPopoverOpened((o) => !o);
                }
              }}
            >
              <Accordion.Item
                value={label}
                bg="transparent"
                style={{ outline: "none", border: "none" }}
              >
                <Accordion.Control
                  p={0}
                  chevron={<></>}
                  style={{
                    backgroundColor: "transparent",
                    color: "white",
                    textDecoration: "none",
                    border: 0,
                    cursor: "pointer",
                  }}
                  styles={{ label: { paddingTop: 0, paddingBottom: 0 } }}
                >
                  <Flex
                    className="sidebar-item"
                    px="xs"
                    py="sm"
                    justify="space-between"
                    align="center"
                  >
                    <Flex align="center" gap={16}>
                      <Center>
                        <Icon size={20} />
                      </Center>
                      <Text
                        fz={14}
                        className={[
                          "sidebar-link",
                          !desktopOpened ? "hidden" : "",
                        ].join(" ")}
                      >
                        {label}
                      </Text>
                    </Flex>

                    {desktopOpened && (
                      <IconChevronRight
                        size={18}
                        className="collapsible-chevron"
                      />
                    )}
                  </Flex>
                </Accordion.Control>

                <Accordion.Panel
                  pl="lg"
                  styles={{ content: { padding: 0 } }}
                  display={!desktopOpened ? "none" : undefined}
                  // style={!desktopOpened ? { display: "none" } : undefined}
                >
                  <Card
                    bg="transparent"
                    radius={0}
                    px={6}
                    py={0}
                    style={{ borderLeft: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    {subItemsContent}
                  </Card>
                </Accordion.Panel>
              </Accordion.Item>
            </div>
          </Popover.Target>
        </AppTooltip>

        <Popover.Dropdown
          bg="navy.8"
          p="xs"
          style={{
            border: "1px solid #0f1e5d",
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.2), 0 2px 4px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1), 0 10px 24px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Text size="sm" fw={600} c="gray.4" mb={6} px={4}>
            {label}
          </Text>
          {subItemsContent}
        </Popover.Dropdown>
      </Popover>
    );
  }

  // ------------------------------------------------------------------
  // 2. SINGLE LINK ITEM
  // ------------------------------------------------------------------
  return (
    <AppTooltip disabled={desktopOpened} position="right" label={label}>
      <Link style={{ color: "white", textDecoration: "none" }} to={to}>
        <Flex
          data-expanded={isActive}
          className="sidebar-item"
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
};

export default SidebarItem;
