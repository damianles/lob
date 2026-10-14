import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import nodemailer from "nodemailer";

const CONFIRM_DAYS = 7;

export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production.replace(/^https?:\/\//, "")}`;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

export function mailIsConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASSWORD?.trim() &&
      process.env.NOTIFICATION_FROM_EMAIL?.trim(),
  );
}

function mailboxOf(value: string): string {
  const wrapped = value.match(/<([^>]+)>/);
  return (wrapped ? wrapped[1] : value).trim().toLowerCase();
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function newConfirmToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = randomBytes(32).toString("base64url");
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + CONFIRM_DAYS * 24 * 60 * 60 * 1000),
  };
}

export function confirmUrl(rawToken: string): string {
  return `${appBaseUrl()}/notifications/confirm?token=${encodeURIComponent(rawToken)}`;
}

function linkSecret(): string | null {
  const secret = process.env.NOTIFICATION_LINK_SECRET?.trim() || process.env.CLERK_SECRET_KEY?.trim();
  return secret || null;
}

export function unsubscribeToken(contactId: string): string | null {
  const secret = linkSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(`lob-unsub:${contactId}`).digest("base64url");
}

export function unsubscribeTokenMatches(contactId: string, token: string): boolean {
  const expected = unsubscribeToken(contactId);
  if (!expected || !token) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function unsubscribeUrl(contactId: string): string | null {
  const token = unsubscribeToken(contactId);
  if (!token) return null;
  const url = new URL(`${appBaseUrl()}/notifications/unsubscribe`);
  url.searchParams.set("contact", contactId);
  url.searchParams.set("token", token);
  return url.toString();
}

export function loadPageUrl(loadId: string): string {
  return `${appBaseUrl()}/loads/${loadId}`;
}

type SendResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendPlainEmail(args: { to: string; subject: string; text: string }): Promise<SendResult> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  const from = process.env.NOTIFICATION_FROM_EMAIL?.trim();
  if (!host || !user || !pass || !from) {
    return { ok: false, error: "Email sending is not configured." };
  }
  if (mailboxOf(from) !== user.toLowerCase()) {
    return { ok: false, error: "From address must be the same mailbox as SMTP_USER." };
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });

  try {
    const info = await transport.sendMail({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
    });
    return { ok: true, id: info.messageId || "" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email send failed";
    return { ok: false, error: message.slice(0, 300) };
  } finally {
    transport.close();
  }
}

export function confirmationEmail(args: { companyName: string; rawToken: string }): { subject: string; text: string } {
  return {
    subject: `Confirm email alerts for ${args.companyName}`,
    text: [
      `Confirm this address for Lumber One Board alerts.`,
      ``,
      `Company: ${args.companyName}`,
      ``,
      `Open this link and press the button. Opening the link does not confirm it.`,
      confirmUrl(args.rawToken),
      ``,
      `If you did not expect this, ignore it. The link expires in 7 days.`,
    ].join("\n"),
  };
}
