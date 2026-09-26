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

/**
 * Click-to-sort rank: Needs repost → Posted → Booked → in transit → delivered → unlisted → Cancelled.
 */
export function loadStatusSortRank(status: string): number {
  switch (status) {
    case "NEEDS_REPOST":
      return 0;
    case "POSTED":
      return 1;
    case "BOOKED":
    case "ASSIGNED":
      return 2;
    case "IN_TRANSIT":
      return 3;
    case "DELIVERED":
      return 4;
    case "UNLISTED":
      return 5;
    case "CANCELLED":
      return 6;
    default:
      return 7;
  }
}
