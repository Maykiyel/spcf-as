import {
  AppShell,
  Button,
  Divider,
  Flex,
  Group,
  Image,
  Text,
} from "@mantine/core";
import logo from "@/assets/logo.png";
import SidebarLinksContainer from "./sidebar-links-container";

const AppSidebar = () => {
  return (
    <AppShell.Navbar
      bg="navy.8"
      withBorder={false}
      c="white"
      style={{ overflow: "hidden" }}
      p={0}
    >
      <Flex direction="column" style={{ whiteSpace: "nowrap" }}>
        <Group px="lg" pt="md" pb="sm" gap="sm" align="center">
          <Image src={logo} w={30} h={30} />
          <Text size="md" c="primary2" fw={600}>
            SPCF AS
          </Text>
        </Group>

        <Divider w="100%" color="rgba(0,0,0,0.2)" />
        <Divider w="100%" color="rgba(255,255,255,0.1)" />
      </Flex>
      <SidebarLinksContainer />

      {/* ---- good for adding log out button at the bottom --- */}
      <AppShell.Section p="lg">
        <Button color="navy" c="navy.4" variant="outline" fullWidth>
          Log Out
        </Button>
        {/* <LogOutModal /> */}
      </AppShell.Section>
    </AppShell.Navbar>
  );
};

export default AppSidebar;
