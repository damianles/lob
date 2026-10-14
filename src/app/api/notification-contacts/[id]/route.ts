import { NotificationEvent } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireNotificationCompany } from "@/lib/notifications/access";
import {
  NotificationContactError,
  removeNotificationContact,
  setNotificationMuted,
  setNotificationPreference,
} from "@/lib/notifications/contacts";

const events = Object.values(NotificationEvent) as [NotificationEvent, ...NotificationEvent[]];

const patchSchema = z.union([
  z.object({ event: z.enum(events), enabled: z.boolean() }),
  z.object({ muted: z.boolean() }),
]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireNotificationCompany();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid alert update." }, { status: 400 });

  try {
    if ("muted" in parsed.data) {
      await setNotificationMuted({
        companyId: access.actor.companyId,
        contactId: id,
        muted: parsed.data.muted,
      });
    } else {
      await setNotificationPreference({
        companyId: access.actor.companyId,
        contactId: id,
        event: parsed.data.event,
        enabled: parsed.data.enabled,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof NotificationContactError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireNotificationCompany();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await ctx.params;
  try {
    await removeNotificationContact({ companyId: access.actor.companyId, contactId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof NotificationContactError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
