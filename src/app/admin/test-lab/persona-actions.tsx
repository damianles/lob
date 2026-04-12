"use client";

import { useState } from "react";

type Props = {
  personaSwitchEnabled: boolean;
};

export function PersonaActions({ personaSwitchEnabled }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function switchTo(target: "ADMIN" | "SHIPPER_DEMO" | "DISPATCHER_DEMO") {
    setBusy(target);
    setMessage("");
    try {
      const res = await fetch("/api/admin/switch-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = (await res.json()) as { error?: string; user?: { role: string } };
      if (!res.ok) {
        setMessage(data.error ?? `Request failed (${res.status})`);
        return;
      }
      setMessage(`Now acting as ${data.user?.role ?? target}. Reloading…`);
      window.location.assign("/");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  if (!personaSwitchEnabled) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-medium">Persona switching is off</p>
        <p className="mt-2 text-amber-900/90">
          Add <code className="rounded bg-amber-100 px-1">LOB_ALLOW_ADMIN_PERSONA_SWITCH=true</code> to{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code> (local) or Vercel env (preview), redeploy, then
          refresh. Also run <code className="rounded bg-amber-100 px-1">npm run db:seed</code> so North Ridge and Blue
          Ox companies exist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void switchTo("ADMIN")}
        >
          {busy === "ADMIN" ? "…" : "Admin only (no company)"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void switchTo("SHIPPER_DEMO")}
        >
          {busy === "SHIPPER_DEMO" ? "…" : "Test as supplier (North Ridge)"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void switchTo("DISPATCHER_DEMO")}
        >
          {busy === "DISPATCHER_DEMO" ? "…" : "Test as carrier (Blue Ox)"}
        </button>
      </div>
      {message && (
        <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800">{message}</p>
      )}
      <p className="text-xs text-zinc-600">
        After switching, open Loads, Capacity, and Booked to exercise each side. Use{" "}
        <strong>Admin only</strong> before using the admin bar links (Carriers / Companies).
      </p>
    </div>
  );
}
