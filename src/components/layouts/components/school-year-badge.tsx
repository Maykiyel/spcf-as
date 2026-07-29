import { Card, Center, Flex, Text } from "@mantine/core";

function SchoolYearBadge() {
  return (
    <Flex>
      <Card
        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        bg="rgba(255,255,255,0.1)"
        c="white"
        py={6}
        px={12}
      >
        <Center h="100%">
          <Text size="xs" fw={500} c="rgba(255,255,255,0.6)" tt="uppercase">
            Active School Year
          </Text>
        </Center>
      </Card>
      <Card
        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
        bg="rgba(255,255,255,0.2)"
        c="white"
        py={6}
        px={12}
      >
        <Text size="sm" fw={500}>
          2026-2027
        </Text>
      </Card>
    </Flex>
  );
}

export default SchoolYearBadge;
