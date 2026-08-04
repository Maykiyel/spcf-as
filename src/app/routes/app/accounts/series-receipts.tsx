import { Stack, Title } from "@mantine/core";
import { SeriesReceiptForm } from "@/features/series-receipts/components/series-receipt-form";
import { SeriesReceiptTable } from "@/features/series-receipts/components/series-receipt-table";

export const Component = () => {
  return (
    <Stack gap="lg">
      <Title order={3}>Series Receipts</Title>
      <SeriesReceiptForm />
      <SeriesReceiptTable />
    </Stack>
  );
};
