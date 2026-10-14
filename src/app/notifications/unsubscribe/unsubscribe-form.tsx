"use client";

import { useState } from "react";

import { lobWoodPrimaryButtonClass } from "@/lib/lob-button-styles";

export function UnsubscribeAlertForm({ contactId, token }: { contactId: string; token: string }) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function stop() {
    setStatus("working");
    setMessage(null);
    try {
      const res = await fetch("/api/notification-contacts/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, token }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; data?: { email?: string } } | null;
      if (!res.ok) {
        setStatus("error");
        setMessage(body?.error || "This link is invalid.");
        return;
      }
      setStatus("done");
      setMessage(`Emails to ${body?.data?.email ?? "this address"} are stopped.`);
    } catch {
      setStatus("error");
      setMessage("Could not stop emails. Try the link again.");
    }
  }

  if (!contactId || !token) {
    return <p className="mt-3 text-sm text-zinc-600">This link is invalid.</p>;
  }

  return (
    <div className="mt-4">
      {status !== "done" ? (
        <button type="button" className={lobWoodPrimaryButtonClass} disabled={status === "working"} onClick={() => void stop()}>
          {status === "working" ? "Stopping…" : "Stop emails to this address"}
        </button>
      ) : null}
      {message ? <p className={`mt-3 text-sm ${status === "error" ? "text-red-700" : "text-zinc-700"}`}>{message}</p> : null}
    </div>
  );
}
