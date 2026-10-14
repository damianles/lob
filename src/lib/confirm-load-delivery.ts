import { DispatchLinkStatus, LoadStatus, NotificationEvent, type Prisma } from "@prisma/client";

import { enqueueLoadNotification } from "@/lib/notifications/dispatch";
import { prisma } from "@/lib/prisma";

type DispatchWithLoad = Prisma.DispatchLinkGetPayload<{ include: { load: true } }>;

export class DeliveryConfirmError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DeliveryConfirmError";
  }
}

function assertDispatchPresent(dispatchLink: DispatchWithLoad | null) {
  if (!dispatchLink) {
    throw new DeliveryConfirmError("Dispatch link is invalid or inactive.", 404);
  }
  if (
    dispatchLink.status !== DispatchLinkStatus.ACTIVE &&
    dispatchLink.status !== DispatchLinkStatus.COMPLETED
  ) {
    throw new DeliveryConfirmError("Dispatch link is invalid or inactive.", 404);
  }
}

async function assertNotExpired(dispatchLink: DispatchWithLoad) {
  if (dispatchLink.expiresAt < new Date() && dispatchLink.status === DispatchLinkStatus.ACTIVE) {
    await prisma.dispatchLink.update({
      where: { id: dispatchLink.id },
      data: { status: DispatchLinkStatus.EXPIRED },
    });
    throw new DeliveryConfirmError("Dispatch link has expired.", 410);
  }
}

async function loadDispatch(loadId: string) {
  return prisma.dispatchLink.findUnique({
    where: { loadId },
    include: { load: true },
  });
}

/** Carrier check-in: marks deliveredAt and closes the load as DELIVERED. */
export async function confirmLoadDeliveryByLoadId(loadId: string, opts?: { suppressNotifications?: boolean }) {
  const dispatchLink = await loadDispatch(loadId);
  assertDispatchPresent(dispatchLink);
  await assertNotExpired(dispatchLink!);

  if (!dispatchLink!.pickupConfirmedAt) {
    throw new DeliveryConfirmError("Pickup must be confirmed before delivery.", 409);
  }
  if (!dispatchLink!.signedBolFileUrl?.trim()) {
    throw new DeliveryConfirmError("Upload the signed BOL before marking delivered.", 409);
  }
  if (dispatchLink!.deliveredAt) {
    throw new DeliveryConfirmError("Carrier delivery is already confirmed for this load.", 409);
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    await tx.dispatchLink.update({
      where: { id: dispatchLink!.id },
      data: {
        deliveredAt: now,
        status: DispatchLinkStatus.COMPLETED,
      },
    });

    await tx.load.update({
      where: { id: dispatchLink!.loadId },
      data: { status: LoadStatus.DELIVERED },
    });

    return tx.dispatchLink.findUnique({
      where: { id: dispatchLink!.id },
      include: { load: true, podDocument: true },
    });
  });

  enqueueLoadNotification({
    loadId,
    to: "shipper",
    event: NotificationEvent.LOAD_DELIVERED,
    dedupeKey: `carrier-delivered:${loadId}`,
    headline: "Carrier marked the load delivered.",
    suppress: opts?.suppressNotifications,
  });

  return updated;
}

/** Supplier check-off: records supplierDeliveredAt. Also marks load DELIVERED if carrier has not yet. */
export async function confirmSupplierDeliveryByLoadId(loadId: string, opts?: { suppressNotifications?: boolean }) {
  const dispatchLink = await loadDispatch(loadId);
  assertDispatchPresent(dispatchLink);
  await assertNotExpired(dispatchLink!);

  if (!dispatchLink!.pickupConfirmedAt) {
    throw new DeliveryConfirmError("Pickup must be confirmed before you can confirm the load complete.", 409);
  }
  if (!dispatchLink!.deliveredAt) {
    throw new DeliveryConfirmError(
      "Wait until the carrier marks delivered (with signed BOL) before confirming complete.",
      409,
    );
  }
  if (dispatchLink!.supplierDeliveredAt) {
    throw new DeliveryConfirmError("You already confirmed this load complete.", 409);
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    await tx.dispatchLink.update({
      where: { id: dispatchLink!.id },
      data: {
        supplierDeliveredAt: now,
        ...(dispatchLink!.deliveredAt ? { status: DispatchLinkStatus.COMPLETED } : {}),
      },
    });

    if (dispatchLink!.load.status !== LoadStatus.DELIVERED) {
      await tx.load.update({
        where: { id: dispatchLink!.loadId },
        data: { status: LoadStatus.DELIVERED },
      });
    }

    return tx.dispatchLink.findUnique({
      where: { id: dispatchLink!.id },
      include: { load: true, podDocument: true },
    });
  });

  enqueueLoadNotification({
    loadId,
    to: "carrier",
    event: NotificationEvent.DELIVERY_CONFIRMED,
    dedupeKey: `supplier-delivered:${loadId}`,
    headline: "Supplier confirmed delivery.",
    suppress: opts?.suppressNotifications,
  });

  return updated;
}

export function isShipmentMutuallyComplete(dispatch: {
  deliveredAt: Date | string | null;
  supplierDeliveredAt: Date | string | null;
}) {
  return Boolean(dispatch.deliveredAt && dispatch.supplierDeliveredAt);
}
