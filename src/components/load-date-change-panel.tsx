"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DateChangeRow = {
  id: string;
  status: string;
  proposedPickupAt: string | null;
  proposedDeliveryAt: string | null;
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
  proposedByCompany?: { legalName: string };
  proposedByUser?: { name: string | null; email: string };
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function LoadDateChangePanel({
  loadId,
  mode,
  currentPickup,
  currentDelivery,
}: {
  loadId: string;
  mode: "supplier" | "carrier";
  currentPickup: string;
  currentDelivery: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<DateChangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await fetch(`/api/loads/${loadId}/date-change-requests`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Could not load date requests.");
      return;
    }
    setRows(Array.isArray(data.data) ? data.data : []);
  }, [loadId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function propose(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/loads/${loadId}/date-change-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposedPickupAt: pickup || undefined,
        proposedDeliveryAt: delivery || undefined,
        note: note.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Could not submit proposal.");
      return;
    }
    setMsg("Proposal sent to the supplier for confirmation.");
    setPickup("");
    setDelivery("");
    setNote("");
    await refresh();
    router.refresh();
  }

  async function review(requestId: string, decision: "APPROVE" | "REJECT") {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/loads/${loadId}/date-change-requests`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, decision }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Review failed.");
      return;
    }
    setMsg(decision === "APPROVE" ? "Dates updated." : "Proposal rejected.");
    await refresh();
    router.refresh();
  }

  const pending = rows.filter((r) => r.status === "PENDING");

  return (
    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Date change requests</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Current: pickup {fmt(currentPickup)} · delivery {fmt(currentDelivery)}
      </p>

      {err && <p className="mt-2 text-sm text-rose-700">{err}</p>}
      {msg && <p className="mt-2 text-sm text-emerald-800">{msg}</p>}

      {mode === "carrier" && (
        <form onSubmit={(e) => void propose(e)} className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-medium text-zinc-600">
            Proposed pickup
            <input type="date" className="mt-1 w-full rounded border px-2 py-2 text-sm" value={pickup} onChange={(e) => setPickup(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-zinc-600">
            Proposed delivery
            <input type="date" className="mt-1 w-full rounded border px-2 py-2 text-sm" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </label>
          <label className="sm:col-span-2 text-xs font-medium text-zinc-600">
            Note
            <input className="mt-1 w-full rounded border px-2 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for the change" />
          </label>
          <button
            type="submit"
            disabled={busy || (!pickup && !delivery)}
            className="rounded-lg bg-lob-navy px-4 py-2 text-sm font-semibold text-white hover:bg-lob-navy-hover disabled:opacity-50 sm:col-span-2 sm:w-fit"
          >
            {busy ? "Sending…" : "Propose date change"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-3 text-xs text-zinc-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500">No date-change requests yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-md border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-zinc-900">{r.status}</span>
                <span className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-700">
                Pickup {fmt(r.proposedPickupAt)} · Delivery {fmt(r.proposedDeliveryAt)}
              </p>
              {r.note && <p className="mt-1 text-xs text-zinc-600">{r.note}</p>}
              {r.proposedByCompany && (
                <p className="mt-1 text-[11px] text-zinc-500">From {r.proposedByCompany.legalName}</p>
              )}
              {mode === "supplier" && r.status === "PENDING" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void review(r.id, "APPROVE")}
                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void review(r.id, "REJECT")}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {mode === "supplier" && pending.length === 0 && rows.length > 0 && (
        <p className="mt-2 text-[11px] text-zinc-500">No pending proposals.</p>
      )}
    </section>
  );
}
