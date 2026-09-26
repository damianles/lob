"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useViewerRole } from "@/components/providers/app-providers";

type Notice = {
  id: string;
  source: "SHIPPER_ALERT" | "CARRIER_NOTICE";
  title: string;
  body: string;
  loadId: string;
  createdAt: string;
  unread: boolean;
  href: string;
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AppNotifications() {
  const { viewer, loading } = useViewerRole();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    void fetch("/api/notifications", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return;
        setItems(Array.isArray(j.data) ? j.data : []);
        setUnread(typeof j.unreadCount === "number" ? j.unreadCount : 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (loading) return;
    if (viewer.kind !== "SHIPPER" && viewer.kind !== "CARRIER" && viewer.kind !== "ADMIN") {
      setItems([]);
      setUnread(0);
      return;
    }
    refresh();
  }, [loading, viewer.kind, viewer.companyId, refresh]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (loading || (viewer.kind !== "SHIPPER" && viewer.kind !== "CARRIER" && viewer.kind !== "ADMIN")) {
    return null;
  }

  async function mark(id: string, source: Notice["source"]) {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, source }),
    });
    refresh();
  }

  async function markAll() {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="relative rounded-full p-2 text-stone-600 hover:bg-stone-100 hover:text-lob-navy"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute right-0.5 top-0.5 inline-flex min-w-[1.05rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold tabular-nums text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-[100] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Notifications</p>
            {unread > 0 ? (
              <button type="button" className="text-[11px] font-medium text-lob-navy underline" onClick={() => void markAll()}>
                Mark all read
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">No notices yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={`${n.source}-${n.id}`} className={n.unread ? "bg-amber-50/70" : "bg-white"}>
                  <Link
                    href={n.href}
                    className="block px-3 py-2.5 hover:bg-stone-50"
                    onClick={() => {
                      if (n.unread) void mark(n.id, n.source);
                      setOpen(false);
                    }}
                  >
                    <p className="text-sm font-semibold text-zinc-900">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">{n.body}</p>
                    <p className="mt-1 text-[11px] text-zinc-400">{timeAgo(n.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
