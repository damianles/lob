import { redirect } from "next/navigation";

/** Facility delivery QR / token pages deferred. Carrier check-in is on the load. */
export default function FacilityDeliveryPage() {
  redirect("/shipments");
}
