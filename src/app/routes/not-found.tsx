import { Stack, Title, Text } from "@mantine/core";
import { useAuthStore } from "@/stores/auth-store";
import AppLayout from "@/components/layouts/app-layout";

const NotFoundContent = () => (
  <Stack align="center" justify="center" mih="60vh" gap="xs">
    <Title order={1}>404</Title>
    <Text c="dimmed">Page not found.</Text>
  </Stack>
);

export const Component = () => {
  const status = useAuthStore((s) => s.status);

  if (status === "authenticated") {
    return (
      <AppLayout>
        <NotFoundContent />
      </AppLayout>
    );
  }

  return <NotFoundContent />;
};
