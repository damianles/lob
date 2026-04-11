import { WebhookEvent } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Missing CLERK_WEBHOOK_SIGNING_SECRET." },
      { status: 500 },
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers." }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(secret);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const primaryEmail = evt.data.email_addresses.find(
      (e) => e.id === evt.data.primary_email_address_id,
    )?.email_address;

    if (!primaryEmail) {
      return NextResponse.json({ ok: true, ignored: "No primary email." });
    }

    await prisma.user.upsert({
      where: { authProviderId: evt.data.id },
      update: {
        email: primaryEmail,
        name: `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim() || "LOB User",
      },
      create: {
        authProviderId: evt.data.id,
        email: primaryEmail,
        name: `${evt.data.first_name ?? ""} ${evt.data.last_name ?? ""}`.trim() || "LOB User",
        role: UserRole.SHIPPER,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

