import { redirect } from "next/navigation";

/** Facility delivery QR hub deferred to a later phase. */
export default function ScanDeliveryHubPage() {
  redirect("/shipments");
}
