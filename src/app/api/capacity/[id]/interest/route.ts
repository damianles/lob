import { CapacityInterestStatus, VerificationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  serializeCapacityInterestError,
  spawnLoadFromCapacity,
} from "@/lib/capacity-interest";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";

const spawnSchema = z.object({
  weightLbs: z.number().int().positive(),
  requestedPickupAt: z.string().min(8),
  requestedDeliveryAt: z.string().min(8).optional(),
  offeredRateUsd: z.number().positive().optional(),
  originCity: z.string().trim().min(2).max(80).optional(),
  originState: z.string().trim().min(2).max(2).optional(),
  destinationCity: z.string().trim().min(2).max(80).optional(),
  destinationState: z.string().trim().min(2).max(2).optional(),
});

const bodySchema = z
  .object({
    loadId: z.string().min(1).optional(),
    spawn: spawnSchema.optional(),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((d, ctx) => {
    if (!d.loadId && !d.spawn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Attach a posted load or create one from this capacity lane.",
      });
    }
    if (d.loadId && d.spawn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose either an existing load or create from capacity — not both.",
      });
    }
  });

/**
 * Supplier requests anonymous capacity for a posted load, or spawns a Firm Rate
 * load from the capacity lane then attaches the request. Carrier identity stays
 * hidden until Accept.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getActorContext();
  if (!isSupplierActor(actor) || !actor.companyId || !actor.userId) {
    return NextResponse.json({ error: "Supplier accounts only." }, { status: 403 });
  }

  const { id: capacityOfferId } = await ctx.params;
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const capacity = await prisma.capacityOffer.findUnique({
    where: { id: capacityOfferId },
    select: {
      id: true,
      status: true,
      carrierCompanyId: true,
      availableFrom: true,
      availableUntil: true,
      originZip: true,
      originCity: true,
      originState: true,
      destinationZip: true,
      destinationCity: true,
      destinationState: true,
      equipmentType: true,
      askingRateUsd: true,
      carrier: { select: { verificationStatus: true } },
    },
  });
  if (!capacity || capacity.status !== "OPEN") {
    return NextResponse.json({ error: "Capacity not found or no longer open." }, { status: 404 });
  }
  if (capacity.carrier.verificationStatus !== VerificationStatus.APPROVED) {
    return NextResponse.json({ error: "That capacity is not available." }, { status: 404 });
  }

  const today = new Date();
  const startToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (capacity.availableUntil < startToday) {
    return NextResponse.json({ error: "That capacity window has ended." }, { status: 410 });
  }

  const excluded = await prisma.shipperCarrierExclusion.findUnique({
    where: {
      shipperCompanyId_carrierCompanyId: {
        shipperCompanyId: actor.companyId,
        carrierCompanyId: capacity.carrierCompanyId,
      },
    },
  });
  if (excluded) {
    return NextResponse.json({ error: "That capacity is not available." }, { status: 404 });
  }

  let loadId = parsed.data.loadId ?? null;
  let spawned: { loadId: string; referenceNumber: string } | null = null;

  try {
    if (parsed.data.spawn) {
      spawned = await spawnLoadFromCapacity({
        shipperCompanyId: actor.companyId,
        createdByUserId: actor.userId,
        capacity,
        spawn: parsed.data.spawn,
      });
      loadId = spawned.loadId;
    } else if (loadId) {
      const load = await prisma.load.findFirst({
        where: {
          id: loadId,
          shipperCompanyId: actor.companyId,
          status: "POSTED",
          booking: { is: null },
        },
        select: { id: true },
      });
      if (!load) {
        return NextResponse.json(
          { error: "Pick one of your posted loads that is still open (not booked)." },
          { status: 400 },
        );
      }
    }

    if (!loadId) {
      return NextResponse.json({ error: "Could not resolve a load for this request." }, { status: 400 });
    }

    const row = await prisma.capacityInterest.create({
      data: {
        capacityOfferId: capacity.id,
        loadId,
        shipperCompanyId: actor.companyId,
        carrierCompanyId: capacity.carrierCompanyId,
        status: CapacityInterestStatus.PENDING,
        note: parsed.data.note?.trim() || null,
        createdByUserId: actor.userId,
      },
    });
    return NextResponse.json(
      {
        data: {
          id: row.id,
          status: row.status,
          loadId,
          spawned: Boolean(spawned),
          referenceNumber: spawned?.referenceNumber ?? null,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    const mapped = serializeCapacityInterestError(e);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    throw e;
  }
}
