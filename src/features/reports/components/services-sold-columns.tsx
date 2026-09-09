import { Anchor } from "@mantine/core";
import { Link } from "react-router";
import type { ColumnDef, SortEntry } from "@/components/ui/data-table";
import { formatCurrency } from "@/utils/currency";
import type { ServiceSoldRow } from "../types";
import {
  serviceBreakdownPath,
  type ReportPeriod,
} from "../lib/services-sold-routes";

/** Declared so the header lights the caret the rows are actually in.
 * `getServicesSold` is what keeps the key on the wire under every other
 * sort; this is only the starting one. */
export const SERVICES_SOLD_DEFAULT_SORTS: SortEntry[] = [
  { key: "service_name", direction: "asc" },
];

/** The columns of `GET /reports/services-sold`. It allow-lists three sorts
 * and no others: `service_name`, `total_quantity` and `subtotal`. */
export function servicesSoldColumns(
  period: ReportPeriod,
): ColumnDef<ServiceSoldRow>[] {
  return [
    {
      key: "service",
      sortKey: "service_name",
      header: "Service",
      sortable: true,
      // A real link, not just a clickable row: it is what a keyboard
      // reaches, a screen reader announces, and middle-click opens.
      render: (row) =>
        row.service ? (
          <Anchor
            component={Link}
            to={serviceBreakdownPath(row.service.id, period)}
          >
            {row.service.name}
          </Anchor>
        ) : (
          "—"
        ),
    },
    {
      key: "total_quantity",
      header: "Quantity Sold",
      sortable: true,
      render: (row) => row.total_quantity.toLocaleString("en-PH"),
    },
    {
      key: "subtotal",
      header: "Revenue",
      sortable: true,
      render: (row) => formatCurrency(row.subtotal),
    },
  ];
}
