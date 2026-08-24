import { use } from "react";
import {
  CatalogBuilderContext,
  type CatalogBuilderValue,
} from "./transaction-builder-context-value";

export function useCatalogBuilder(): CatalogBuilderValue {
  const context = use(CatalogBuilderContext);
  if (!context) {
    throw new Error(
      "useCatalogBuilder must be used within a TransactionBuilderProvider",
    );
  }
  return context;
}
