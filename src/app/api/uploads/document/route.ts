import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getActorContext } from "@/lib/request-context";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

/**
 * Upload credit/tax/insurance documents to Vercel Blob.
 * Requires BLOB_READ_WRITE_TOKEN. Without it, clients fall back to paste-https.
 */
export async function POST(req: Request) {
  const actor = await getActorContext();
  if (!actor.clerkUserId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return NextResponse.json(
      {
        error:
          "File upload is not configured yet. Paste an https:// link below, or ask LOB to enable Blob storage.",
      },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "DOC").slice(0, 40);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 10 MB." }, { status: 400 });
  }
  const type = file.type || "application/octet-stream";
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: "Only PDF or image files (JPEG, PNG, WebP) are allowed." }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "document";
  const pathname = `lob-docs/${actor.clerkUserId}/${kind}-${Date.now()}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: type,
    addRandomSuffix: true,
  });

  return NextResponse.json({
    data: { url: blob.url, pathname: blob.pathname, contentType: type, kind },
  });
}
