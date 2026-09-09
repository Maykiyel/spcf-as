import { tableParamName } from "@/components/ui/data-table";

/** Each view's table namespace, and so the names of the period params in
 * its URL. Both pages link to each other, so neither spells the other's. */
export const SERVICES_SOLD_URL_KEY = "services_sold";
export const SERVICE_BREAKDOWN_URL_KEY = "breakdown";

export const SERVICES_SOLD_PATH = "/reports/services-sold";
export const SERVICE_BREAKDOWN_PATH = "/reports/services-sold/:serviceId";

/** A period as it moves between the two views: the table's own filter
 * values, which are strings off the URL or `null`. */
export type ReportPeriod = { from: string | null; to: string | null };

const withPeriod = (path: string, urlKey: string, period: ReportPeriod) => {
  const params = new URLSearchParams();
  if (period.from) params.set(tableParamName(urlKey, "from_date"), period.from);
  if (period.to) params.set(tableParamName(urlKey, "to_date"), period.to);

  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

/** Both dates are written even when they match the target's own default: a
 * link sent in October has to still open the September figures it was sent
 * to explain, and the endpoint requires them. */
export const serviceBreakdownPath = (
  serviceId: number,
  period: ReportPeriod,
) =>
  withPeriod(
    `${SERVICES_SOLD_PATH}/${serviceId}`,
    SERVICE_BREAKDOWN_URL_KEY,
    period,
  );

/** The way back, carrying the period so an admin checking several services
 * in turn does not re-pick it each time. */
export const servicesSoldPath = (period: ReportPeriod) =>
  withPeriod(SERVICES_SOLD_PATH, SERVICES_SOLD_URL_KEY, period);
