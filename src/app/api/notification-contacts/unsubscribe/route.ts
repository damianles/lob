import { NextResponse } from "next/server";
import { z } from "zod";

import { muteNotificationContactByToken, NotificationContactError } from "@/lib/notifications/contacts";

const bodySchema = z.object({
  contactId: z.string().trim().min(1).max(64),
  token: z.string().trim().min(20).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "This link is invalid." }, { status: 400 });
  }
  try {
    const data = await muteNotificationContactByToken(parsed.data);
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof NotificationContactError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
