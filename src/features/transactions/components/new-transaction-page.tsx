import { Grid, Paper, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { TransactionBuilderProvider } from "./transaction-builder-context";
import { TransactionDraftPanel } from "./transaction-draft-panel";
import { FeeCatalogPanel } from "./fee-catalog-panel";
import { FiltersPanel } from "./filters-panel";

export function NewTransactionPage() {
  const theme = useMantineTheme();
  // Mirrors the Grid.Col spans below rather than a second literal: those
  // are what actually stacks the panels, and the height model just needs
  // to agree with them, not pick its own breakpoint.
  const isSideBySide = useMediaQuery(
    `(min-width: ${theme.breakpoints.md})`,
    true,
    { getInitialValueInEffect: false },
  );

  const colStyle = isSideBySide ? { height: "100%" } : undefined;
  const paperStyle = isSideBySide
    ? { display: "flex", flexDirection: "column" as const, overflow: "hidden" }
    : undefined;

  return (
    <TransactionBuilderProvider>
      <Grid
        gap="xl"
        p="sm"
        align="stretch"
        style={isSideBySide ? { flex: 1, minHeight: 0 } : undefined}
        styles={isSideBySide ? { inner: { height: "100%" } } : undefined}
      >
        <Grid.Col span={{ base: 12, md: 2 }} style={colStyle}>
          <Paper h={isSideBySide ? "100%" : undefined} style={paperStyle}>
            <FiltersPanel />
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }} style={colStyle}>
          <Paper h={isSideBySide ? "100%" : undefined} style={paperStyle}>
            <FeeCatalogPanel fillHeight={isSideBySide} />
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }} style={colStyle}>
          <Paper h={isSideBySide ? "100%" : undefined} style={paperStyle}>
            <TransactionDraftPanel fillHeight={isSideBySide} />
          </Paper>
        </Grid.Col>
      </Grid>
    </TransactionBuilderProvider>
  );
}
