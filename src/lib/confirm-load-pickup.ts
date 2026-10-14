import { DispatchLinkStatus, LoadStatus, NotificationEvent, type Prisma } from "@prisma/client";

import { enqueueLoadNotification } from "@/lib/notifications/dispatch";
import { prisma } from "@/lib/prisma";

type DispatchWithLoad = Prisma.DispatchLinkGetPayload<{ include: { load: true } }>;

export class PickupConfirmError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PickupConfirmError";
  }
}

async function assertDispatchReady(dispatchLink: DispatchWithLoad | null) {
  if (!dispatchLink || dispatchLink.status !== DispatchLinkStatus.ACTIVE) {
    throw new PickupConfirmError("Dispatch link is invalid or inactive.", 404);
  }
  if (dispatchLink.expiresAt < new Date()) {
    await prisma.dispatchLink.update({
      where: { id: dispatchLink.id },
      data: { status: DispatchLinkStatus.EXPIRED },
    });
    throw new PickupConfirmError("Dispatch link has expired.", 410);
  }
  if (dispatchLink.pickupConfirmedAt) {
    throw new PickupConfirmError("Pickup is already confirmed for this load.", 409);
  }
}

export async function confirmLoadPickupByToken(token: string) {
  const dispatchLink = await prisma.dispatchLink.findUnique({
    where: { token },
    include: { load: true },
  });

  await assertDispatchReady(dispatchLink);

  return confirmLoadPickupTransaction(dispatchLink!.id);
}

export async function confirmLoadPickupByLoadId(loadId: string, opts?: { suppressNotifications?: boolean }) {
  const dispatchLink = await prisma.dispatchLink.findUnique({
    where: { loadId },
    include: { load: true },
  });

  await assertDispatchReady(dispatchLink);

  return confirmLoadPickupTransaction(dispatchLink!.id, opts);
}

async function confirmLoadPickupTransaction(dispatchLinkId: string, opts?: { suppressNotifications?: boolean }) {
  const link = await prisma.$transaction(async (tx) => {
    const updated = await tx.dispatchLink.update({
      where: { id: dispatchLinkId },
      data: { pickupConfirmedAt: new Date() },
      include: { load: true },
    });

    await tx.load.update({
      where: { id: updated.loadId },
      data: { status: LoadStatus.IN_TRANSIT },
    });

    return updated;
  });

  enqueueLoadNotification({
    loadId: link.loadId,
    to: "shipper",
    event: NotificationEvent.LOAD_PICKED_UP,
    dedupeKey: `pickup:${link.loadId}`,
    headline: "Load picked up.",
    suppress: opts?.suppressNotifications,
  });

  return link;
}
