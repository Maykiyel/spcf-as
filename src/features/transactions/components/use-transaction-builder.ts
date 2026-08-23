import { use } from "react";
import {
  TransactionBuilderContext,
  type TransactionBuilderContextValue,
} from "./transaction-builder-context-value";

export function useTransactionBuilder(): TransactionBuilderContextValue {
  const context = use(TransactionBuilderContext);
  if (!context) {
    throw new Error(
      "useTransactionBuilder must be used within a TransactionBuilderProvider",
    );
  }
  return context;
}
