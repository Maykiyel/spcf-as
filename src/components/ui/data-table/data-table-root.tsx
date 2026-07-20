import type { ReactNode } from "react";
import { Divider, Paper, Title, Stack } from "@mantine/core";
import { DataTableContext } from "./data-table-context";
import type { DataTableContextValue } from "./types";

type DataTableRootProps<T> = {
  title: string;
  state: DataTableContextValue<T>;
  children: ReactNode;
};

export function DataTableRoot<T>({
  title,
  state,
  children,
}: DataTableRootProps<T>) {
  return (
    <DataTableContext.Provider value={state}>
      <Paper radius="md" shadow="sm" withBorder>
        <Title order={5} c="primary" p="md" bg={"navy.1"}>
          {title}
        </Title>
        <Divider mb={"sm"} />
        <Stack gap="md" p="md" pt={0}>
          {children}
        </Stack>
      </Paper>
    </DataTableContext.Provider>
  );
}
