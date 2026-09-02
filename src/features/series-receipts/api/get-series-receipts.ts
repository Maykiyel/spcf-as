import { createListAdapter } from "@/components/ui/data-table";
import type { SeriesReceipt } from "../types";

export const getSeriesReceipts = createListAdapter<SeriesReceipt>(
  "/series-receipts",
  "series_receipts",
  { supportsSearch: true },
);
