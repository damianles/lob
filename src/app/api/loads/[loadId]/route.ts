import { LoadStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { queueBookedCarrierChangeNotices } from "@/lib/load-change-notices";
import { extractLumberSpec, lumberSpecToLoadColumns } from "@/lib/lumber-spec";
import { parseRequestedPickupAt } from "@/lib/parse-pickup-date";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";
import { updateLoadSchema } from "@/lib/validation";

const EDITABLE: LoadStatus[] = [
  LoadStatus.POSTED,
  LoadStatus.BOOKED,
  LoadStatus.ASSIGNED,
];

export async function PATCH(req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const { loadId } = await ctx.params;
  const actor = await getActorContext();

  if (!isSupplierActor(actor) && !(actor.realRole === "ADMIN" && !actor.simulated)) {
    return NextResponse.json({ error: "Only the posting supplier can edit this load." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = updateLoadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const payload = parsed.data;

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    include: {
      booking: { select: { carrierCompanyId: true } },
    },
  });

  if (!load) {
    return NextResponse.json({ error: "Load not found." }, { status: 404 });
  }

  const isOwner = isSupplierActor(actor) && load.shipperCompanyId === actor.companyId;
  const isRealAdmin = actor.realRole === "ADMIN" && !actor.simulated;
  if (!isOwner && !isRealAdmin) {
    return NextResponse.json({ error: "You can only edit loads posted by your company." }, { status: 403 });
  }

  if (!EDITABLE.includes(load.status)) {
    return NextResponse.json(
      { error: `Cannot edit a load in status ${load.status}.` },
      { status: 409 },
    );
  }

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const data: Prisma.LoadUpdateInput = {};

  const track = (key: string, from: unknown, to: unknown) => {
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[key] = { from, to };
    }
  };

  if (payload.originCity != null) {
    track("originCity", load.originCity, payload.originCity);
    data.originCity = payload.originCity;
  }
  if (payload.originState != null) {
    const v = payload.originState.toUpperCase();
    track("originState", load.originState, v);
    data.originState = v;
  }
  if (payload.originZip != null) {
    track("originZip", load.originZip, payload.originZip);
    data.originZip = payload.originZip;
  }
  if (payload.destinationCity != null) {
    track("destinationCity", load.destinationCity, payload.destinationCity);
    data.destinationCity = payload.destinationCity;
  }
  if (payload.destinationState != null) {
    const v = payload.destinationState.toUpperCase();
    track("destinationState", load.destinationState, v);
    data.destinationState = v;
  }
  if (payload.destinationZip != null) {
    track("destinationZip", load.destinationZip, payload.destinationZip);
    data.destinationZip = payload.destinationZip;
  }
  if (payload.weightLbs != null) {
    track("weightLbs", load.weightLbs, payload.weightLbs);
    data.weightLbs = payload.weightLbs;
  }
  if (payload.equipmentType != null) {
    track("equipmentType", load.equipmentType, payload.equipmentType);
    data.equipmentType = payload.equipmentType;
  }
  if (payload.isRush != null) {
    track("isRush", load.isRush, payload.isRush);
    data.isRush = payload.isRush;
  }
  if (payload.offerCurrency != null) {
    track("offerCurrency", load.offerCurrency, payload.offerCurrency);
    data.offerCurrency = payload.offerCurrency;
  }
  if (payload.offeredRateUsd != null) {
    track("offeredRateUsd", Number(load.offeredRateUsd), payload.offeredRateUsd);
    data.offeredRateUsd = payload.offeredRateUsd;
  }
  if (payload.requestedPickupAt != null) {
    const pickupAt = parseRequestedPickupAt(payload.requestedPickupAt);
    if (!pickupAt) {
      return NextResponse.json({ error: "Invalid pickup date." }, { status: 400 });
    }
    track("requestedPickupAt", load.requestedPickupAt.toISOString(), pickupAt.toISOString());
    data.requestedPickupAt = pickupAt;
  }
  if (payload.requestedDeliveryAt !== undefined) {
    if (payload.requestedDeliveryAt === null) {
      track("requestedDeliveryAt", load.requestedDeliveryAt?.toISOString() ?? null, null);
      data.requestedDeliveryAt = null;
    } else {
      const deliveryAt = parseRequestedPickupAt(payload.requestedDeliveryAt);
      if (!deliveryAt) {
        return NextResponse.json({ error: "Invalid delivery date." }, { status: 400 });
      }
      track(
        "requestedDeliveryAt",
        load.requestedDeliveryAt?.toISOString() ?? null,
        deliveryAt.toISOString(),
      );
      data.requestedDeliveryAt = deliveryAt;
    }
  }
  if (payload.extendedPosting != null) {
    const prev =
      load.extendedPosting && typeof load.extendedPosting === "object" && !Array.isArray(load.extendedPosting)
        ? (load.extendedPosting as Record<string, unknown>)
        : {};
    const merged = { ...prev, ...payload.extendedPosting };
    track("extendedPosting", load.extendedPosting, merged);
    data.extendedPosting = merged as Prisma.InputJsonValue;
    const lumberSpec = extractLumberSpec(merged);
    Object.assign(data, lumberSpecToLoadColumns(lumberSpec));
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "No changes submitted." }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.load.update({
      where: { id: load.id },
      data,
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        requestedPickupAt: true,
        requestedDeliveryAt: true,
        offeredRateUsd: true,
        offerCurrency: true,
        weightLbs: true,
        equipmentType: true,
        isRush: true,
      },
    });

    let noticesQueued = 0;
    if (load.booking?.carrierCompanyId && load.status !== LoadStatus.POSTED) {
      const result = await queueBookedCarrierChangeNotices(tx, {
        loadId: load.id,
        carrierCompanyId: load.booking.carrierCompanyId,
        title: `Load ${load.referenceNumber} updated`,
        summary:
          payload.changeSummary?.trim() ||
          `Supplier updated ${Object.keys(changes).join(", ")} on ${load.referenceNumber}.`,
        changes,
      });
      noticesQueued = result.queued;
    }

    return { row, noticesQueued };
  });

  return NextResponse.json({
    data: updated.row,
    noticesQueued: updated.noticesQueued,
    emailDelivery: "deferred",
    message:
      updated.noticesQueued > 0
        ? "Load updated. Carrier notice queued (email sending deferred — visible on carrier profile / notice log)."
        : "Load updated.",
  });
}
