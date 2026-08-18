import type { LaneDecisionContext } from "@/lib/lane-decision-types";

const inflight = new Map<string, Promise<LaneDecisionContext | null>>();

export function fetchLaneDecisionContext(loadId: string): Promise<LaneDecisionContext | null> {
  let pending = inflight.get(loadId);
  if (!pending) {
    pending = fetch(`/api/loads/${loadId}/rate-context`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        const json = (await res.json()) as { data?: LaneDecisionContext };
        return json.data ?? null;
      })
      .catch(() => null);
    inflight.set(loadId, pending);
  }
  return pending;
}
