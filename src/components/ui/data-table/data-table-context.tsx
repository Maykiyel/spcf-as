import { createContext, useContext } from "react";
import type { DataTableContextValue } from "./types";

export const DataTableContext =
  createContext<DataTableContextValue<any> | null>(null);

export function useDataTableContext<T>(): DataTableContextValue<T> {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error(
      "DataTable subcomponents must be used within <DataTable.Root>",
    );
  }
  return ctx;
}
