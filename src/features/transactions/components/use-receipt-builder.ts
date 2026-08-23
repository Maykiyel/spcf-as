import { use } from "react";
import {
  ReceiptBuilderContext,
  type ReceiptBuilderValue,
} from "./transaction-builder-context-value";

export function useReceiptBuilder(): ReceiptBuilderValue {
  const context = use(ReceiptBuilderContext);
  if (!context) {
    throw new Error(
      "useReceiptBuilder must be used within a TransactionBuilderProvider",
    );
  }
  return context;
}
