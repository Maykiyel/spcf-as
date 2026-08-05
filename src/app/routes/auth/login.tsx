import { Navigate, useLocation } from "react-router";
import {
  Center,
  Container,
  Divider,
  Group,
  Paper,
  Image,
  Title,
  Text,
  Stack,
} from "@mantine/core";
import { LoginForm } from "@/features/auth/components/login-form";
import spcfLogo from "@/assets/logo.png";
import ictduLogo from "@/assets/favicon.png";
import { useAuthStore } from "@/stores/auth-store";
import { DASHBOARD_PATH } from "@/config/pages";

export const Component = () => {
  // const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (status === "authenticated" && user) {
    return (
      <Navigate
        to={DASHBOARD_PATH}
        replace
        state={{ from: location }}
      />
    );
  }

  return (
    <Center
      h="100vh"
      bg="linear-gradient(180deg, var(--mantine-color-primary-6) 10%, var(--mantine-color-navy-8) 100%)"
    >
      <Container size="sm" w="100%">
        <Paper p="xl" radius="lg" shadow="md">
          <Stack gap="lg">
            <Title order={3} ta="center" c="dark">
              SPCF ACCOUNTING OFFICE - LOGIN
            </Title>
            <LoginForm />
            <Divider />
            <Text size="sm" c="dimmed" ta="center">
              Copyright © SYSTEMS PLUS COLLEGE FOUNDATION - 2026
            </Text>
            <Group justify="center">
              <Image src={spcfLogo} w={40}></Image>
              <Image src={ictduLogo} w={40}></Image>
            </Group>
          </Stack>
        </Paper>
      </Container>
    </Center>
  );
};
