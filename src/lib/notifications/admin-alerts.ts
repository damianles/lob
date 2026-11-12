import { UserRole } from "@prisma/client";
import { after } from "next/server";

import { prisma } from "@/lib/prisma";

import { appBaseUrl, mailIsConfigured, sendPlainEmail } from "./mail";

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

/** Ops inboxes for signup / verification queue alerts. */
export function adminNotifyEmailsFromEnv(): string[] {
  const primary = parseEmailList(process.env.LOB_ADMIN_NOTIFY_EMAILS);
  if (primary.length > 0) return primary;
  // Fallback: same list used for auto-admin elevation (preview / ops convenience).
  const auto = parseEmailList(process.env.LOB_AUTO_ADMIN_EMAILS);
  if (auto.length > 0) return auto;
  const single = process.env.LOB_AUTO_ADMIN_EMAIL?.trim().toLowerCase();
  return single?.includes("@") ? [single] : [];
}

async function resolveAdminEmails(): Promise<string[]> {
  const set = new Set(adminNotifyEmailsFromEnv());
  const dbAdmins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { email: true },
    take: 50,
  });
  for (const u of dbAdmins) {
    const e = u.email?.trim().toLowerCase();
    if (e?.includes("@")) set.add(e);
  }
  return [...set];
}

export type CompanySignupAlert = {
  companyId: string;
  legalName: string;
  role: "SHIPPER" | "DISPATCHER";
  verificationStatus: string;
  contactName?: string | null;
  contactEmail?: string | null;
  businessPhone?: string | null;
  carrierType?: string | null;
  supplierKind?: string | null;
  authorityRegion?: string | null;
};

async function deliverCompanySignupAlert(input: CompanySignupAlert) {
  if (!mailIsConfigured()) {
    console.warn("[admin-alerts] SMTP not configured; skipped signup notice for", input.legalName);
    return;
  }

  const emails = await resolveAdminEmails();
  if (emails.length === 0) {
    console.warn(
      "[admin-alerts] No admin emails (set LOB_ADMIN_NOTIFY_EMAILS or create ADMIN users); skipped",
      input.legalName,
    );
    return;
  }

  const kind = input.role === "SHIPPER" ? "supplier" : "carrier";
  const queuePath = input.role === "SHIPPER" ? "/admin/suppliers" : "/admin/carriers";
  const queueUrl = `${appBaseUrl()}${queuePath}`;

  const lines = [
    `A new ${kind} signed up on Lumber One Board.`,
    "",
    `Company: ${input.legalName}`,
    `Type: ${kind}${input.carrierType ? ` (${input.carrierType})` : ""}${input.supplierKind ? ` (${input.supplierKind})` : ""}`,
    `Region: ${input.authorityRegion ?? "—"}`,
    `Status: ${input.verificationStatus}`,
    `Contact: ${input.contactName ?? "—"} <${input.contactEmail ?? "—"}>`,
    `Phone: ${input.businessPhone ?? "—"}`,
    "",
    `Review queue: ${queueUrl}`,
  ];

  const subject =
    input.verificationStatus === "APPROVED"
      ? `LOB signup (auto-approved): ${input.legalName}`
      : `LOB signup needs review: ${input.legalName}`;

  for (const to of emails) {
    const sent = await sendPlainEmail({
      to,
      subject,
      text: lines.join("\n"),
    });
    if (!sent.ok) {
      console.error("[admin-alerts] send failed", to, sent.error);
    }
  }
}

/** Fire-and-forget after company onboarding succeeds. */
export function enqueueAdminCompanySignupNotice(input: CompanySignupAlert) {
  const job = () =>
    deliverCompanySignupAlert(input).catch((err) => console.error("[admin-alerts]", err));
  try {
    after(job);
  } catch {
    void job();
  }
}
