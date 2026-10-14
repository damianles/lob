import { redirect } from "next/navigation";

/** Facility pickup QR / token pages deferred. Carrier check-in is on the load. */
export default function FacilityPickupPage() {
  redirect("/shipments");
}
