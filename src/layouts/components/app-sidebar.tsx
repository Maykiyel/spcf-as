import { AppShell, Flex, Group, Text } from "@mantine/core";

const AppSidebar = () => {
  return (
    <AppShell.Navbar
      bg="#0f1e5d"
      withBorder={false}
      c="white"
      style={{ overflow: "hidden" }}
      p="md"
    >
      <Group px={8} pb={26}>
        <Flex align="center" gap={10} style={{ whiteSpace: "nowrap" }}>
          <Text size="lg" c="primary2" fw={600}>
            SPCF AS
          </Text>
        </Flex>
      </Group>
      {/* <SidebarLinksContainer desktopOpened={desktopOpened} /> */}

      {/* ---- good for adding log out button at the bottom --- */}
      {/* <AppShell.Section p="0"> */}
      {/* <LogOutModal /> */}
      {/* </AppShell.Section> */}
    </AppShell.Navbar>
  );
};

export default AppSidebar;
