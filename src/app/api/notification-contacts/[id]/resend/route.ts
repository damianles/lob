import { NextResponse } from "next/server";

import { requireNotificationCompany } from "@/lib/notifications/access";
import { NotificationContactError, resendNotificationConfirmation } from "@/lib/notifications/contacts";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireNotificationCompany();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await ctx.params;
  try {
    await resendNotificationConfirmation({ companyId: access.actor.companyId, contactId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof NotificationContactError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
