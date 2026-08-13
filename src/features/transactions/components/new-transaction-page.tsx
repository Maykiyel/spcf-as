import { Grid, Paper } from "@mantine/core";
import { TransactionBuilderProvider } from "./transaction-builder-context";
import { ReceiptPanel } from "./receipt-panel";
import { FeeCatalogPanel } from "./fee-catalog-panel";
import { FiltersPanel } from "./filters-panel";

export function NewTransactionPage() {
  return (
    <TransactionBuilderProvider>
      <Grid
        gap="xl"
        p="sm"
        align="stretch"
        style={{ flex: 1, minHeight: 0 }}
        styles={{ inner: { height: "100%" } }}
      >
        <Grid.Col span={{ base: 12, md: 2 }} style={{ height: "100%" }}>
          <Paper
            h="100%"
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <FiltersPanel />
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }} style={{ height: "100%" }}>
          <Paper
            h="100%"
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <FeeCatalogPanel />
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }} style={{ height: "100%" }}>
          <Paper
            h="100%"
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <ReceiptPanel />
          </Paper>
        </Grid.Col>
      </Grid>
    </TransactionBuilderProvider>
  );
}
