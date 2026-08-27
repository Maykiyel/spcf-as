import { use } from "react";
import {
  TransactionDraftContext,
  type TransactionDraftValue,
} from "./transaction-builder-context-value";

export function useTransactionDraft(): TransactionDraftValue {
  const context = use(TransactionDraftContext);
  if (!context) {
    throw new Error(
      "useTransactionDraft must be used within a TransactionBuilderProvider",
    );
  }
  return context;
}
