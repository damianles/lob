import { NextResponse } from "next/server";
import { z } from "zod";

import { confirmNotificationContact, NotificationContactError } from "@/lib/notifications/contacts";

const bodySchema = z.object({
  token: z.string().trim().min(20).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "This link is invalid or expired." }, { status: 400 });
  }
  try {
    const data = await confirmNotificationContact(parsed.data.token);
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof NotificationContactError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
