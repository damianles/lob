import { DateChangeRequestStatus, LoadStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { queueBookedCarrierChangeNotices } from "@/lib/load-change-notices";
import { parseRequestedPickupAt } from "@/lib/parse-pickup-date";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { isSupplierActor } from "@/lib/simulated-actor-company";
import { createDateChangeRequestSchema, reviewDateChangeRequestSchema } from "@/lib/validation";

const reviewBodySchema = reviewDateChangeRequestSchema.extend({
  requestId: z.string().min(1),
});

export async function GET(_req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const { loadId } = await ctx.params;
  const actor = await getActorContext();

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      id: true,
      shipperCompanyId: true,
      booking: { select: { carrierCompanyId: true } },
    },
  });
  if (!load) return NextResponse.json({ error: "Load not found." }, { status: 404 });

  const isOwner = isSupplierActor(actor) && load.shipperCompanyId === actor.companyId;
  const isBookedCarrier =
    Boolean(load.booking) &&
    actor.companyId === load.booking!.carrierCompanyId &&
    (actor.role === "DISPATCHER" || actor.role === "ADMIN");
  const isRealAdmin = actor.realRole === "ADMIN" && !actor.simulated;

  if (!isOwner && !isBookedCarrier && !isRealAdmin) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const rows = await prisma.loadDateChangeRequest.findMany({
    where: { loadId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      proposedByUser: { select: { name: true, email: true } },
      proposedByCompany: { select: { legalName: true } },
    },
  });

  return NextResponse.json({ data: rows });
}

export async function POST(req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const { loadId } = await ctx.params;
  const actor = await getActorContext();

  if (!actor.userId || !actor.companyId || (actor.role !== "DISPATCHER" && actor.role !== "ADMIN")) {
    return NextResponse.json({ error: "Booked carriers can propose date changes." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = createDateChangeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      id: true,
      status: true,
      booking: { select: { carrierCompanyId: true } },
    },
  });
  if (!load) return NextResponse.json({ error: "Load not found." }, { status: 404 });
  if (!load.booking || load.booking.carrierCompanyId !== actor.companyId) {
    return NextResponse.json({ error: "Only the booked carrier can propose a date change." }, { status: 403 });
  }
  if (load.status === LoadStatus.CANCELLED || load.status === LoadStatus.DELIVERED) {
    return NextResponse.json({ error: "Cannot propose dates on a cancelled or delivered load." }, { status: 409 });
  }

  const pending = await prisma.loadDateChangeRequest.count({
    where: { loadId, status: DateChangeRequestStatus.PENDING },
  });
  if (pending > 0) {
    return NextResponse.json(
      { error: "A pending date-change request already exists. Wait for the supplier to respond." },
      { status: 409 },
    );
  }

  const proposedPickupAt = parsed.data.proposedPickupAt
    ? parseRequestedPickupAt(parsed.data.proposedPickupAt)
    : null;
  const proposedDeliveryAt = parsed.data.proposedDeliveryAt
    ? parseRequestedPickupAt(parsed.data.proposedDeliveryAt)
    : null;

  if (parsed.data.proposedPickupAt && !proposedPickupAt) {
    return NextResponse.json({ error: "Invalid proposed pickup date." }, { status: 400 });
  }
  if (parsed.data.proposedDeliveryAt && !proposedDeliveryAt) {
    return NextResponse.json({ error: "Invalid proposed delivery date." }, { status: 400 });
  }

  const row = await prisma.loadDateChangeRequest.create({
    data: {
      loadId,
      proposedByUserId: actor.userId,
      proposedByCompanyId: actor.companyId,
      proposedPickupAt,
      proposedDeliveryAt,
      note: parsed.data.note?.trim() || null,
    },
  });

  return NextResponse.json({ data: row }, { status: 201 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ loadId: string }> }) {
  const { loadId } = await ctx.params;
  const actor = await getActorContext();

  if (!isSupplierActor(actor) && !(actor.realRole === "ADMIN" && !actor.simulated)) {
    return NextResponse.json({ error: "Only the posting supplier can review date changes." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = reviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      id: true,
      referenceNumber: true,
      shipperCompanyId: true,
      booking: { select: { carrierCompanyId: true } },
    },
  });
  if (!load) return NextResponse.json({ error: "Load not found." }, { status: 404 });

  const isOwner = isSupplierActor(actor) && load.shipperCompanyId === actor.companyId;
  const isRealAdmin = actor.realRole === "ADMIN" && !actor.simulated;
  if (!isOwner && !isRealAdmin) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const request = await prisma.loadDateChangeRequest.findFirst({
    where: { id: parsed.data.requestId, loadId, status: DateChangeRequestStatus.PENDING },
  });
  if (!request) {
    return NextResponse.json({ error: "Pending request not found." }, { status: 404 });
  }

  if (parsed.data.decision === "REJECT") {
    const updated = await prisma.loadDateChangeRequest.update({
      where: { id: request.id },
      data: {
        status: DateChangeRequestStatus.REJECTED,
        reviewedByUserId: actor.userId!,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote?.trim() || null,
      },
    });
    return NextResponse.json({ data: updated });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedReq = await tx.loadDateChangeRequest.update({
      where: { id: request.id },
      data: {
        status: DateChangeRequestStatus.APPROVED,
        reviewedByUserId: actor.userId!,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote?.trim() || null,
      },
    });

    const loadUpdate: { requestedPickupAt?: Date; requestedDeliveryAt?: Date } = {};
    if (request.proposedPickupAt) loadUpdate.requestedPickupAt = request.proposedPickupAt;
    if (request.proposedDeliveryAt) loadUpdate.requestedDeliveryAt = request.proposedDeliveryAt;

    await tx.load.update({
      where: { id: loadId },
      data: loadUpdate,
    });

    if (load.booking?.carrierCompanyId) {
      await queueBookedCarrierChangeNotices(tx, {
        loadId,
        carrierCompanyId: load.booking.carrierCompanyId,
        title: `Date change approved · ${load.referenceNumber}`,
        summary: "Supplier approved your proposed pickup/delivery date change.",
        changes: {
          proposedPickupAt: request.proposedPickupAt?.toISOString() ?? null,
          proposedDeliveryAt: request.proposedDeliveryAt?.toISOString() ?? null,
        },
      });
    }

    return updatedReq;
  });

  return NextResponse.json({ data: result, message: "Dates updated and carrier notice queued." });
}
