import type { ReactNode } from "react";
import { DataTableContext } from "./data-table-context";
import type { DataTableContextValue } from "./types";
import { Card } from "@/components/ui/card";

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
      <Card.Root>
        <Card.Header title={title} />
        <Card.Divider />
        <Card.Body>{children}</Card.Body>
      </Card.Root>
    </DataTableContext.Provider>
  );
}
