"use client";

import { useState } from "react";

import { lobWoodPrimaryButtonClass } from "@/lib/lob-button-styles";

export function ConfirmAlertForm({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function confirm() {
    setStatus("working");
    setMessage(null);
    try {
      const res = await fetch("/api/notification-contacts/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        data?: { email?: string; companyName?: string; already?: boolean };
      } | null;
      if (!res.ok) {
        setStatus("error");
        setMessage(body?.error || "This link is invalid or expired.");
        return;
      }
      setStatus("done");
      const company = body?.data?.companyName;
      const email = body?.data?.email;
      setMessage(
        body?.data?.already
          ? `${email ?? "This address"} was already confirmed${company ? ` for ${company}` : ""}.`
          : `${email ?? "This address"} will now receive the alerts ${company ?? "the company"} turned on.`,
      );
    } catch {
      setStatus("error");
      setMessage("Could not confirm this address. Try the link again.");
    }
  }

  if (!token) {
    return <p className="mt-3 text-sm text-zinc-600">This link is missing a token. Use the link from the email.</p>;
  }

  return (
    <div className="mt-4">
      {status !== "done" ? (
        <button type="button" className={lobWoodPrimaryButtonClass} disabled={status === "working"} onClick={() => void confirm()}>
          {status === "working" ? "Confirming…" : "Confirm this address"}
        </button>
      ) : null}
      {message ? <p className={`mt-3 text-sm ${status === "error" ? "text-red-700" : "text-zinc-700"}`}>{message}</p> : null}
    </div>
  );
}
