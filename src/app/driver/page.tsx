import { redirect } from "next/navigation";

/** Driver hub tab removed — dispatch + email/text paperwork live on each booked load. */
export default function DriverHubPage() {
  redirect("/shipments");
}
