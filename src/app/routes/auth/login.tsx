import { useNavigate } from "react-router";
import {
  Center,
  Container,
  Divider,
  Paper,
  Title,
  Text,
  Stack,
} from "@mantine/core";
import { LoginForm } from "@/features/auth/components/login-form";

export const Component = () => {
  const navigate = useNavigate();

  return (
    <Center
      h="100vh"
      bg="linear-gradient(180deg, var(--mantine-color-primary-6) 10%, var(--mantine-color-navy-8) 100%)"
    >
      <Container size="xs" w="100%">
        <Paper p="xl" radius="md" shadow="md">
          <Stack gap="lg">
            <Title order={3} ta="center" c="dark">
              SPCF ACCOUNTING OFFICE - LOGIN
            </Title>

            <LoginForm onSuccess={() => navigate("/dashboard")} />

            <Divider />

            <Text size="xs" c="dimmed" ta="center">
              Copyright © SYSTEMS PLUS COLLEGE FOUNDATION - 2026
            </Text>
          </Stack>
        </Paper>
      </Container>
    </Center>
  );
};
