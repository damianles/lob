import { redirect } from "next/navigation";

/** Facility pickup QR hub deferred to a later phase. */
export default function ScanPickupHubPage() {
  redirect("/shipments");
}
