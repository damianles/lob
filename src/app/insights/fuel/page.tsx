import { redirect } from "next/navigation";

/** Fuel Insights is unlinked until we have reliable diesel data. */
export default function FuelInsightsRemovedPage() {
  redirect("/insights/lanes");
}
