/** Human label for Load.status. ASSIGNED is carrier-internal; mills see Booked. */
export function displayLoadStatus(status: string): string {
  switch (status) {
    case "POSTED":
      return "Posted";
    case "BOOKED":
    case "ASSIGNED":
      return "Booked";
    case "IN_TRANSIT":
      return "In transit";
    case "DELIVERED":
      return "Delivered";
    case "NEEDS_REPOST":
      return "Needs repost";
    case "UNLISTED":
      return "Unlisted";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status.replace(/_/g, " ");
  }
}
