import type { PageLeaf } from "@/config/pages";
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
import { useDisclosure } from "@mantine/hooks";
import SidebarSubItem from "./sidebar-sub-item";
import { useSidebarStore } from "@/stores/sidebar-store";
import AppTooltip from "./app-tooltip";

type SidebarItemCollapsibleProps = {
  label: string;
  icon: Icon;
  collapsible: PageLeaf[];
};

function SidebarItemCollapsible({
  label,
  icon: Icon,
  collapsible,
}: SidebarItemCollapsibleProps) {
  const { desktopOpened } = useSidebarStore();
  const [opened, { open, close, toggle }] = useDisclosure(false);

  const subItemsContent = (
    <Stack gap={2}>
      {collapsible.map((item, i) => (
        <SidebarSubItem key={i} subItem={item} />
      ))}
    </Stack>
  );

  return (
    <Popover
      key={String(desktopOpened)} // resets `opened` on collapse/expand instead of an effect
      position="right-start"
      offset={5}
      withinPortal
      shadow="md"
      disabled={desktopOpened}
      opened={!desktopOpened && opened}
      onChange={(v) => (v ? open() : close())}
      transitionProps={{ transition: "fade-right", duration: 150 }}
    >
      <AppTooltip disabled={desktopOpened} position="right" label={label}>
        <Popover.Target>
          <div onClick={() => !desktopOpened && toggle()}>
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

export default SidebarItemCollapsible;
