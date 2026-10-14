import { NotificationEvent, type Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { defaultEnabled, eventsForCompany, labelForCompany, NOTICE_EVENTS } from "./events";
import {
  confirmationEmail,
  hashToken,
  mailIsConfigured,
  newConfirmToken,
  sendPlainEmail,
  unsubscribeTokenMatches,
} from "./mail";

const EXTRA_CAP = 10;
const CONFIRM_COOLDOWN_MS = 60_000;

export class NotificationContactError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "NotificationContactError";
  }
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

async function writeDefaultPreferences(contactId: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  await db.notificationPreference.createMany({
    data: NOTICE_EVENTS.map((row) => ({
      contactId,
      event: row.event,
      enabled: row.defaultOn,
    })),
    skipDuplicates: true,
  });
}

export async function ensureAccountContacts(companyId: string) {
  const users = await prisma.user.findMany({
    where: { companyId },
    select: { id: true, email: true },
  });
  if (users.length === 0) return;

  const contacts = await prisma.notificationContact.findMany({ where: { companyId } });

  for (const user of users) {
    const email = normalizeEmail(user.email);
    if (!email) continue;

    const byUser =
      contacts.find((c) => c.userId === user.id) ??
      (await prisma.notificationContact.findUnique({ where: { userId: user.id } }));

    if (byUser) {
      const emailTaken = contacts.some((c) => c.id !== byUser.id && c.email === email);
      if (!emailTaken && (byUser.companyId !== companyId || byUser.email !== email || !byUser.confirmedAt)) {
        const updated = await prisma.notificationContact.update({
          where: { id: byUser.id },
          data: {
            companyId,
            email,
            confirmedAt: byUser.confirmedAt ?? new Date(),
            confirmTokenHash: null,
            confirmExpiresAt: null,
          },
        });
        const idx = contacts.findIndex((c) => c.id === byUser.id);
        if (idx >= 0) contacts[idx] = updated;
        else contacts.push(updated);
      }
      await writeDefaultPreferences(byUser.id);
      continue;
    }

    const byEmail = contacts.find((c) => c.email === email);
    if (byEmail) {
      if (!byEmail.userId) {
        const updated = await prisma.notificationContact.update({
          where: { id: byEmail.id },
          data: { userId: user.id, confirmedAt: byEmail.confirmedAt ?? new Date() },
        });
        const idx = contacts.findIndex((c) => c.id === byEmail.id);
        if (idx >= 0) contacts[idx] = updated;
      }
      await writeDefaultPreferences(byEmail.id);
      continue;
    }

    const created = await prisma.notificationContact.create({
      data: {
        companyId,
        email,
        userId: user.id,
        confirmedAt: new Date(),
      },
    });
    contacts.push(created);
    await writeDefaultPreferences(created.id);
  }
}

export type NotificationSettingsContact = {
  id: string;
  email: string;
  isAccount: boolean;
  confirmed: boolean;
  muted: boolean;
  preferences: Partial<Record<NotificationEvent, boolean>>;
};

export type NotificationSettings = {
  companyName: string;
  mailConfigured: boolean;
  events: { id: NotificationEvent; label: string; group: string; defaultOn: boolean }[];
  contacts: NotificationSettingsContact[];
};

export async function getNotificationSettings(companyId: string): Promise<NotificationSettings> {
  await ensureAccountContacts(companyId);
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { legalName: true, supplierKind: true, carrierType: true },
  });
  if (!company) throw new NotificationContactError("Company not found.", 404);

  const flags = { supplierKind: company.supplierKind, carrierType: company.carrierType };
  const visible = eventsForCompany(flags);
  const contacts = await prisma.notificationContact.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    include: { preferences: true },
  });
  contacts.sort((a, b) => Number(Boolean(b.userId)) - Number(Boolean(a.userId)) || a.createdAt.getTime() - b.createdAt.getTime());

  return {
    companyName: company.legalName,
    mailConfigured: mailIsConfigured(),
    events: visible.map((row) => ({
      id: row.event,
      label: labelForCompany(row.event, flags),
      group: row.group,
      defaultOn: row.defaultOn,
    })),
    contacts: contacts.map((contact) => {
      const preferences: Partial<Record<NotificationEvent, boolean>> = {};
      for (const row of visible) {
        const saved = contact.preferences.find((p) => p.event === row.event);
        preferences[row.event] = saved ? saved.enabled : defaultEnabled(row.event);
      }
      return {
        id: contact.id,
        email: contact.email,
        isAccount: Boolean(contact.userId),
        confirmed: Boolean(contact.confirmedAt),
        muted: Boolean(contact.mutedAt),
        preferences,
      };
    }),
  };
}

async function sendConfirmation(contactId: string, email: string, companyName: string) {
  const token = newConfirmToken();
  await prisma.notificationContact.update({
    where: { id: contactId },
    data: {
      confirmTokenHash: token.hash,
      confirmExpiresAt: token.expiresAt,
      confirmSentAt: new Date(),
    },
  });
  const message = confirmationEmail({ companyName, rawToken: token.raw });
  const sent = await sendPlainEmail({ to: email, subject: message.subject, text: message.text });
  if (!sent.ok) {
    console.error("[notifications] confirm send failed", sent.error);
    throw new NotificationContactError(
      sent.error === "Email sending is not configured."
        ? "Saved, but the confirmation email was not sent. Mail is not connected on this server yet."
        : "Saved, but the confirmation email could not be sent. Use Send link again in a minute.",
      503,
    );
  }
}

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export async function addNotificationContact(args: { companyId: string; email: string }) {
  const parsedEmail = emailSchema.safeParse(args.email);
  if (!parsedEmail.success) {
    throw new NotificationContactError("Enter a valid email address.", 400);
  }
  const email = parsedEmail.data;

  const company = await prisma.company.findUnique({
    where: { id: args.companyId },
    select: { legalName: true },
  });
  if (!company) throw new NotificationContactError("Company not found.", 404);

  const existing = await prisma.notificationContact.findUnique({
    where: { companyId_email: { companyId: args.companyId, email } },
  });

  if (existing?.confirmedAt) {
    throw new NotificationContactError("That address is already on this list.", 409);
  }

  if (existing) {
    if (existing.confirmSentAt && Date.now() - existing.confirmSentAt.getTime() < CONFIRM_COOLDOWN_MS) {
      throw new NotificationContactError("A confirmation email was just sent. Wait a minute, then resend.", 429);
    }
    try {
      await sendConfirmation(existing.id, email, company.legalName);
    } catch (e) {
      if (e instanceof NotificationContactError) {
        return { id: existing.id, email, warning: e.message };
      }
      throw e;
    }
    return { id: existing.id, email, warning: null as string | null };
  }

  const extras = await prisma.notificationContact.count({
    where: { companyId: args.companyId, userId: null },
  });
  if (extras >= EXTRA_CAP) {
    throw new NotificationContactError(`You can add up to ${EXTRA_CAP} extra addresses.`, 400);
  }

  const created = await prisma.notificationContact.create({
    data: { companyId: args.companyId, email },
  });
  await writeDefaultPreferences(created.id);

  try {
    await sendConfirmation(created.id, email, company.legalName);
  } catch (e) {
    if (e instanceof NotificationContactError) {
      return { id: created.id, email, warning: e.message };
    }
    throw e;
  }
  return { id: created.id, email, warning: null as string | null };
}

export async function resendNotificationConfirmation(args: { companyId: string; contactId: string }) {
  const contact = await prisma.notificationContact.findFirst({
    where: { id: args.contactId, companyId: args.companyId },
    include: { company: { select: { legalName: true } } },
  });
  if (!contact) throw new NotificationContactError("Address not found.", 404);
  if (contact.confirmedAt) throw new NotificationContactError("This address is already confirmed.", 409);
  if (contact.confirmSentAt && Date.now() - contact.confirmSentAt.getTime() < CONFIRM_COOLDOWN_MS) {
    throw new NotificationContactError("A confirmation email was just sent. Wait a minute, then resend.", 429);
  }
  await sendConfirmation(contact.id, contact.email, contact.company.legalName);
}

export async function setNotificationPreference(args: {
  companyId: string;
  contactId: string;
  event: NotificationEvent;
  enabled: boolean;
}) {
  const contact = await prisma.notificationContact.findFirst({
    where: { id: args.contactId, companyId: args.companyId },
    select: { id: true },
  });
  if (!contact) throw new NotificationContactError("Address not found.", 404);
  if (!Object.values(NotificationEvent).includes(args.event)) {
    throw new NotificationContactError("Unknown alert.", 400);
  }
  await prisma.notificationPreference.upsert({
    where: { contactId_event: { contactId: contact.id, event: args.event } },
    create: { contactId: contact.id, event: args.event, enabled: args.enabled },
    update: { enabled: args.enabled },
  });
}

export async function setNotificationMuted(args: { companyId: string; contactId: string; muted: boolean }) {
  const contact = await prisma.notificationContact.findFirst({
    where: { id: args.contactId, companyId: args.companyId },
    select: { id: true },
  });
  if (!contact) throw new NotificationContactError("Address not found.", 404);
  await prisma.notificationContact.update({
    where: { id: contact.id },
    data: { mutedAt: args.muted ? new Date() : null },
  });
}

export async function removeNotificationContact(args: { companyId: string; contactId: string }) {
  const contact = await prisma.notificationContact.findFirst({
    where: { id: args.contactId, companyId: args.companyId },
    select: { id: true, userId: true },
  });
  if (!contact) throw new NotificationContactError("Address not found.", 404);
  if (contact.userId) {
    throw new NotificationContactError("The sign-up email stays on the list. Turn alerts off instead.", 400);
  }
  await prisma.notificationContact.delete({ where: { id: contact.id } });
}

export async function confirmNotificationContact(rawToken: string): Promise<{ email: string; companyName: string; already: boolean }> {
  const token = rawToken.trim();
  if (token.length < 20) throw new NotificationContactError("This link is invalid or expired.", 400);
  const contact = await prisma.notificationContact.findUnique({
    where: { confirmTokenHash: hashToken(token) },
    include: { company: { select: { legalName: true } } },
  });
  if (!contact || !contact.confirmExpiresAt || contact.confirmExpiresAt.getTime() < Date.now()) {
    throw new NotificationContactError("This link is invalid or expired.", 400);
  }
  if (contact.confirmedAt) {
    return { email: contact.email, companyName: contact.company.legalName, already: true };
  }
  await prisma.notificationContact.update({
    where: { id: contact.id },
    data: { confirmedAt: new Date() },
  });
  return { email: contact.email, companyName: contact.company.legalName, already: false };
}

export async function muteNotificationContactByToken(args: { contactId: string; token: string }) {
  if (!unsubscribeTokenMatches(args.contactId, args.token)) {
    throw new NotificationContactError("This link is invalid.", 400);
  }
  const contact = await prisma.notificationContact.findUnique({
    where: { id: args.contactId },
    select: { id: true, email: true },
  });
  if (!contact) throw new NotificationContactError("This link is invalid.", 400);
  await prisma.notificationContact.update({
    where: { id: contact.id },
    data: { mutedAt: new Date() },
  });
  return { email: contact.email };
}
