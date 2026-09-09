import { Anchor } from "@mantine/core";
import { Link } from "react-router";
import type { ColumnDef } from "@/components/ui/data-table";
import { formatCurrency } from "@/utils/currency";
import type { ServiceSoldRow } from "../types";
import {
  serviceBreakdownPath,
  type ReportPeriod,
} from "../lib/services-sold-routes";

/** The columns of `GET /reports/services-sold`. All three sort, under the
 * keys `SERVICES_SOLD_SORT_PLAN` allow-lists. */
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
