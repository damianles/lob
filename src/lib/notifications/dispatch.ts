import { NotificationDeliveryStatus, NotificationEvent } from "@prisma/client";
import { after } from "next/server";

import { prisma } from "@/lib/prisma";

import { ensureAccountContacts } from "./contacts";
import { companyMatchesEvent, defaultEnabled } from "./events";
import { loadPageUrl, sendPlainEmail, unsubscribeUrl } from "./mail";

export type NoticeInput = {
  companyId: string;
  event: NotificationEvent;
  /** Stable per occurrence. The recipient address is appended so each inbox gets one copy. */
  dedupeKey: string;
  subject: string;
  headline: string;
  lines?: string[];
  loadId?: string | null;
  /** Skip the signup address of the person who just did the action. Extra addresses still receive it. */
  excludeUserId?: string | null;
  suppress?: boolean;
};

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}

function formatWhen(value: Date | null | undefined): string {
  if (!value) return "not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function enqueueNotice(input: NoticeInput) {
  if (input.suppress) return;
  const job = () => deliverNotice(input).catch((err) => console.error("[notifications]", err));
  try {
    after(job);
  } catch {
    void job();
  }
}

async function deliverNotice(input: NoticeInput) {
  await ensureAccountContacts(input.companyId);

  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    select: { id: true, legalName: true, supplierKind: true, carrierType: true },
  });
  if (!company) return;
  if (!companyMatchesEvent(input.event, company)) return;

  const contacts = await prisma.notificationContact.findMany({
    where: { companyId: company.id, confirmedAt: { not: null }, mutedAt: null },
    include: { preferences: { where: { event: input.event } } },
  });

  const loadUrl = input.loadId ? loadPageUrl(input.loadId) : null;

  for (const contact of contacts) {
    if (input.excludeUserId && contact.userId === input.excludeUserId) continue;
    const pref = contact.preferences[0];
    const enabled = pref ? pref.enabled : defaultEnabled(input.event);
    if (!enabled) continue;

    const dedupeKey = `${input.dedupeKey}:${contact.email}`.slice(0, 500);
    let claim: { id: string };
    try {
      claim = await prisma.notificationDelivery.create({
        data: {
          companyId: company.id,
          contactId: contact.id,
          event: input.event,
          loadId: input.loadId ?? null,
          toEmail: contact.email,
          subject: input.subject.slice(0, 200),
          status: NotificationDeliveryStatus.FAILED,
          error: "pending",
          dedupeKey,
        },
        select: { id: true },
      });
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }

    const stopUrl = unsubscribeUrl(contact.id);
    const text = [
      input.headline,
      "",
      ...(input.lines ?? []),
      ...(loadUrl ? ["", `Open the load: ${loadUrl}`] : []),
      "",
      `Sent to ${contact.email} for ${company.legalName}.`,
      "Someone at that company can change this under Email alerts in Lumber One Board.",
      ...(stopUrl ? [`Stop all mail to this address: ${stopUrl}`] : []),
    ].join("\n");

    const sent = await sendPlainEmail({ to: contact.email, subject: input.subject, text });
    await prisma.notificationDelivery.update({
      where: { id: claim.id },
      data: sent.ok
        ? { status: NotificationDeliveryStatus.SENT, providerId: sent.id || null, error: null }
        : { status: NotificationDeliveryStatus.FAILED, error: sent.error },
    });
    if (!sent.ok) console.error("[notifications] send failed", input.event, sent.error);
  }
}

export function enqueueLoadNotification(args: {
  loadId: string;
  to: "shipper" | "carrier";
  carrierCompanyId?: string | null;
  event: NotificationEvent;
  dedupeKey: string;
  headline: string;
  detail?: string | null;
  excludeUserId?: string | null;
  suppress?: boolean;
}) {
  if (args.suppress) return;
  const job = () => deliverLoadNotification(args).catch((err) => console.error("[notifications]", err));
  try {
    after(job);
  } catch {
    void job();
  }
}

async function deliverLoadNotification(args: {
  loadId: string;
  to: "shipper" | "carrier";
  carrierCompanyId?: string | null;
  event: NotificationEvent;
  dedupeKey: string;
  headline: string;
  detail?: string | null;
  excludeUserId?: string | null;
}) {
  const load = await prisma.load.findUnique({
    where: { id: args.loadId },
    select: {
      id: true,
      referenceNumber: true,
      originCity: true,
      originState: true,
      destinationCity: true,
      destinationState: true,
      requestedPickupAt: true,
      requestedDeliveryAt: true,
      shipperCompanyId: true,
      booking: { select: { carrierCompanyId: true } },
    },
  });
  if (!load) return;

  const companyId =
    args.to === "shipper" ? load.shipperCompanyId : (args.carrierCompanyId ?? load.booking?.carrierCompanyId ?? null);
  if (!companyId) return;

  const lines = [
    `${load.referenceNumber}`,
    `${load.originCity}, ${load.originState} to ${load.destinationCity}, ${load.destinationState}`,
    `Pickup: ${formatWhen(load.requestedPickupAt)}`,
    `Delivery: ${formatWhen(load.requestedDeliveryAt)}`,
  ];
  if (args.detail?.trim()) lines.push(args.detail.trim());

  await deliverNotice({
    companyId,
    event: args.event,
    dedupeKey: args.dedupeKey,
    subject: `${args.headline.replace(/\.$/, "")} (${load.referenceNumber})`.slice(0, 200),
    headline: args.headline,
    lines,
    loadId: load.id,
    excludeUserId: args.excludeUserId,
  });
}

/** Opted-in carriers whose insurance expires within 30 days. One email per expiry date. */
export async function enqueueInsuranceExpiryNotices() {
  const prefs = await prisma.notificationPreference.findMany({
    where: {
      event: NotificationEvent.INSURANCE_EXPIRING,
      enabled: true,
      contact: { mutedAt: null, confirmedAt: { not: null } },
    },
    select: { contact: { select: { companyId: true } } },
    take: 200,
  });
  const companyIds = [
    ...new Set(prefs.map((row) => row.contact.companyId).filter((id): id is string => typeof id === "string")),
  ];
  if (companyIds.length === 0) return;

  const now = new Date();
  const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const docs = await prisma.document.findMany({
    where: {
      kind: "INSURANCE",
      companyId: { in: companyIds },
      expiresAt: { gte: now, lte: until },
    },
    select: { companyId: true, expiresAt: true },
    take: 100,
  });

  for (const doc of docs) {
    if (!doc.companyId || !doc.expiresAt) continue;
    const day = doc.expiresAt.toISOString().slice(0, 10);
    enqueueNotice({
      companyId: doc.companyId,
      event: NotificationEvent.INSURANCE_EXPIRING,
      dedupeKey: `insurance:${doc.companyId}:${day}`,
      subject: `Insurance on file expires ${day}`,
      headline: `Insurance on file expires on ${day}.`,
      lines: ["Update the certificate in Carrier Profile before it lapses."],
    });
  }
}

export function enqueueExpiredBidNotices(
  bids: { id: string; loadId: string; carrierCompanyId: string; kind: string; amountUsd: unknown; currency: string }[],
  opts?: { suppress?: boolean },
) {
  if (opts?.suppress) return;
  for (const bid of bids) {
    const amount = Number(bid.amountUsd);
    const money = Number.isFinite(amount) ? `${amount.toFixed(2)} ${bid.currency}` : null;
    enqueueLoadNotification({
      loadId: bid.loadId,
      to: "carrier",
      carrierCompanyId: bid.carrierCompanyId,
      event: NotificationEvent.BID_EXPIRED,
      dedupeKey: `bid-expired:${bid.id}`,
      headline: bid.kind === "COUNTER" ? "Your counter offer expired." : "Your bid expired.",
      detail: money,
    });
  }
}
