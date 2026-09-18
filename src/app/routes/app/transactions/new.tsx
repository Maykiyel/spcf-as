import { Stack, Title } from "@mantine/core";
import { NewTransactionPage } from "@/features/transactions/components/new-transaction-page";
import { useSideBySidePanels } from "@/features/transactions/components/use-side-by-side-panels";

export const Component = () => {
  const isSideBySide = useSideBySidePanels();

  return (
    <Stack
      gap="xs"
      style={
        isSideBySide
          ? {
              height:
                "calc(100dvh - var(--app-shell-header-height) - (var(--app-shell-padding) * 2))",
              overflow: "hidden",
            }
          : undefined
      }
    >
      <Title order={3}>New Transaction</Title>
      <NewTransactionPage />
    </Stack>
  );
};
