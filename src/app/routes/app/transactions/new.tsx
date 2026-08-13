import { Stack, Title } from "@mantine/core";
import { NewTransactionPage } from "@/features/transactions/components/new-transaction-page";

export const Component = () => {
  return (
    <Stack
      gap="xs"
      style={{
        height:
          "calc(100dvh - var(--app-shell-header-height) - (var(--app-shell-padding) * 2))",
        overflow: "hidden",
      }}
    >
      <Title order={3}>New Transaction</Title>
      <NewTransactionPage />
    </Stack>
  );
};
