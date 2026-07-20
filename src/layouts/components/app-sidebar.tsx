import {
  ActionIcon,
  AppShell,
  Center,
  Divider,
  Flex,
  Image,
  Text,
} from "@mantine/core";
import logo from "@/assets/logo.png";
import SidebarLinksContainer from "./sidebar-links-container";
import {
  IconLayoutSidebarLeftCollapseFilled,
  IconLayoutSidebarRightCollapseFilled,
} from "@tabler/icons-react";
import { useSidebarStore } from "@/stores/sidebar-store";

const AppSidebar = () => {
  const { toggleDesktop, desktopOpened } = useSidebarStore();

  return (
    <AppShell.Navbar
      bg="navy.8"
      withBorder={false}
      c="white"
      style={{ overflow: "hidden" }}
      p={0}
    >
      <Flex direction="column" style={{ whiteSpace: "nowrap" }}>
        <Flex
          px={"lg"}
          pt="md"
          pb="sm"
          gap="sm"
          align="center"
          justify="space-between"
        >
          <Flex align="center" gap="sm">
            {desktopOpened ? (
              <Image src={logo} w={30} h={30} />
            ) : (
              <Center style={{ width: 30, height: 30 }}>
                <ActionIcon
                  onClick={toggleDesktop}
                  color="navy"
                  c="navy"
                  className="sidebar-toggle"
                  variant="transparent"
                >
                  <IconLayoutSidebarRightCollapseFilled />
                </ActionIcon>
              </Center>
            )}
            <Text
              className={[
                "sidebar-logo-text",
                desktopOpened ? "" : "hidden",
              ].join(" ")}
              size="md"
              c="primary2"
              fw={600}
            >
              SPCF AS
            </Text>
          </Flex>

          {desktopOpened && (
            <ActionIcon
              onClick={toggleDesktop}
              color="navy"
              c="navy"
              className="sidebar-toggle"
              variant="transparent"
            >
              <IconLayoutSidebarLeftCollapseFilled />
            </ActionIcon>
          )}
        </Flex>

        <Divider w="100%" color="rgba(0,0,0,0.2)" />
        <Divider w="100%" color="rgba(255,255,255,0.1)" />
      </Flex>
      <SidebarLinksContainer />

      {/* ---- good for adding log out button at the bottom --- */}
      {/* <AppShell.Section p="lg">
      </AppShell.Section> */}
    </AppShell.Navbar>
  );
};

export default AppSidebar;
