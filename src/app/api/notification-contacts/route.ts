import { NextResponse } from "next/server";
import { z } from "zod";

import { requireNotificationCompany } from "@/lib/notifications/access";
import { addNotificationContact, getNotificationSettings, NotificationContactError } from "@/lib/notifications/contacts";

const addSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function GET() {
  const access = await requireNotificationCompany();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    const data = await getNotificationSettings(access.actor.companyId);
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof NotificationContactError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function POST(req: Request) {
  const access = await requireNotificationCompany();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  try {
    const data = await addNotificationContact({ companyId: access.actor.companyId, email: parsed.data.email });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    if (e instanceof NotificationContactError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
