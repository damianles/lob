import { CapacityInterestStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

/**
 * Capacity match inbox:
 * - Carrier: pending requests on their capacity (mill name shown so they can decide).
 * - Supplier: requests they sent (carrier identity still hidden until accepted).
 */
export async function GET() {
  const actor = await getActorContext();
  if (!actor.userId || !actor.companyId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (actor.role === "DISPATCHER" || (actor.role === "ADMIN" && !isSupplierActor(actor))) {
    const rows = await prisma.capacityInterest.findMany({
      where: {
        carrierCompanyId: actor.companyId,
        status: CapacityInterestStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        shipper: { select: { legalName: true } },
        load: {
          select: {
            id: true,
            referenceNumber: true,
            originCity: true,
            originState: true,
            destinationCity: true,
            destinationState: true,
            equipmentType: true,
            offeredRateUsd: true,
            offerCurrency: true,
            requestedPickupAt: true,
            requestedDeliveryAt: true,
          },
        },
        capacity: {
          select: {
            id: true,
            originCity: true,
            originState: true,
            originZip: true,
            destinationCity: true,
            destinationState: true,
            destinationZip: true,
            equipmentType: true,
            askingRateUsd: true,
          },
        },
      },
    });

    return NextResponse.json({
      perspective: "carrier",
      data: rows.map((r) => ({
        id: r.id,
        status: r.status,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        shipperName: r.shipper.legalName,
        load: {
          ...r.load,
          offeredRateUsd: r.load.offeredRateUsd != null ? Number(r.load.offeredRateUsd) : null,
          requestedPickupAt: r.load.requestedPickupAt.toISOString(),
          requestedDeliveryAt: r.load.requestedDeliveryAt?.toISOString() ?? null,
        },
        capacity: {
          ...r.capacity,
          askingRateUsd: Number(r.capacity.askingRateUsd),
        },
      })),
    });
  }

  if (isSupplierActor(actor)) {
    const rows = await prisma.capacityInterest.findMany({
      where: { shipperCompanyId: actor.companyId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        load: {
          select: {
            id: true,
            referenceNumber: true,
            originCity: true,
            originState: true,
            destinationCity: true,
            destinationState: true,
          },
        },
        capacity: {
          select: {
            id: true,
            originCity: true,
            originState: true,
            originZip: true,
            destinationCity: true,
            destinationState: true,
            destinationZip: true,
            equipmentType: true,
            askingRateUsd: true,
            carrier: {
              select: { carrierType: true, isOwnerOperator: true, verificationStatus: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      perspective: "shipper",
      data: rows.map((r) => ({
        id: r.id,
        status: r.status,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        // Identity stays hidden until accept (then they use the booked load page).
        carrierRevealed: r.status === "ACCEPTED",
        load: r.load,
        capacity: {
          id: r.capacity.id,
          originCity: r.capacity.originCity,
          originState: r.capacity.originState,
          originZip: r.capacity.originZip,
          destinationCity: r.capacity.destinationCity,
          destinationState: r.capacity.destinationState,
          destinationZip: r.capacity.destinationZip,
          equipmentType: r.capacity.equipmentType,
          askingRateUsd: Number(r.capacity.askingRateUsd),
          carrierType: r.capacity.carrier.carrierType,
          isOwnerOperator: r.capacity.carrier.isOwnerOperator,
          carrierVerified: r.capacity.carrier.verificationStatus === "APPROVED",
        },
      })),
    });
  }

  return NextResponse.json({ error: "Not allowed." }, { status: 403 });
}
