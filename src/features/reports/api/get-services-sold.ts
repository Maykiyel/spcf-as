import { createListAdapter } from "@/components/ui/data-table";
import type { ServiceSoldRow } from "../types";

/** One page of `GET /reports/services-sold`. No `supportsSearch`: an
 * unknown filter key here is a 400. */
export const getServicesSold = createListAdapter<ServiceSoldRow>(
  "/reports/services-sold",
  "services",
);
