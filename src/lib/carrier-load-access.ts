import { LoadCarrierVisibilityMode, type PrismaClient } from "@prisma/client";

export type PostedLoadForVisibility = {
  id: string;
  shipperCompanyId: string;
  carrierVisibilityMode: LoadCarrierVisibilityMode;
};

export type PostedLoadVisibilityContext = {
  globalBlockedShipperIds: Set<string>;
  tierLoadIds: Set<string>;
  perLoadExcludedLoadIds: Set<string>;
};

export async function fetchPostedLoadVisibilityContext(
  db: PrismaClient,
  carrierCompanyId: string,
  loads: PostedLoadForVisibility[],
): Promise<PostedLoadVisibilityContext> {
  if (loads.length === 0) {
    return {
      globalBlockedShipperIds: new Set(),
      tierLoadIds: new Set(),
      perLoadExcludedLoadIds: new Set(),
    };
  }

  const shipperIds = [...new Set(loads.map((l) => l.shipperCompanyId))];
  const loadIds = loads.map((l) => l.id);

  const [globalRows, tierRows, excludeRows] = await Promise.all([
    db.shipperCarrierExclusion.findMany({
      where: { carrierCompanyId, shipperCompanyId: { in: shipperIds } },
      select: { shipperCompanyId: true },
    }),
    db.loadCarrierTier.findMany({
      where: { loadId: { in: loadIds }, carrierCompanyId },
      select: { loadId: true },
    }),
    db.loadCarrierExclusion.findMany({
      where: { loadId: { in: loadIds }, carrierCompanyId },
      select: { loadId: true },
    }),
  ]);

  return {
    globalBlockedShipperIds: new Set(globalRows.map((r) => r.shipperCompanyId)),
    tierLoadIds: new Set(tierRows.map((r) => r.loadId)),
    perLoadExcludedLoadIds: new Set(excludeRows.map((r) => r.loadId)),
  };
}

export function postedLoadVisibleToCarrier(
  load: PostedLoadForVisibility,
  ctx: PostedLoadVisibilityContext,
): boolean {
  if (ctx.globalBlockedShipperIds.has(load.shipperCompanyId)) return false;
  if (ctx.perLoadExcludedLoadIds.has(load.id)) return false;
  if (load.carrierVisibilityMode === LoadCarrierVisibilityMode.TIER_ASSIGNED) {
    return ctx.tierLoadIds.has(load.id);
  }
  return true;
}

export async function carrierMayViewPostedLoad(
  db: PrismaClient,
  load: PostedLoadForVisibility,
  carrierCompanyId: string,
): Promise<boolean> {
  const ctx = await fetchPostedLoadVisibilityContext(db, carrierCompanyId, [load]);
  return postedLoadVisibleToCarrier(load, ctx);
}
