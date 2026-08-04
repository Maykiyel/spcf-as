import { z } from "zod";
import { apiClient } from "@/lib/axios/api-client";
import type { CreateSeriesReceiptPayload } from "../lib/series-receipt-form-logic";
import type { SeriesReceipt } from "../types";

export const seriesReceiptInputSchema = z.object({
  cashierId: z.coerce.number().int().gt(0, "Select a cashier"),
  sheets: z.coerce.number().int().gt(0, "Enter a valid sheet count"),
});

export type SeriesReceiptFormInput = z.input<typeof seriesReceiptInputSchema>;
export type SeriesReceiptInputFields = z.output<
  typeof seriesReceiptInputSchema
>;

export type { CreateSeriesReceiptPayload };

export const createSeriesReceipt = async (
  data: CreateSeriesReceiptPayload,
): Promise<SeriesReceipt> => {
  const response = await apiClient.post<SeriesReceipt, CreateSeriesReceiptPayload>(
    "/series-receipts",
    data,
  );
  return response.data;
};
