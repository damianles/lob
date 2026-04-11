"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LobSidebar, type LobSidebarStats } from "@/components/lob-sidebar";

export type SerializableLoad = {
  id: string;
  referenceNumber: string;
  originCity: string;
  originState: string;
  originZip: string;
  destinationCity: string;
  destinationState: string;
  destinationZip: string;
  weightLbs: number;
  equipmentType: string;
  isRush: boolean;
  status: string;
  uniquePickupCode: string | null;
  shipperCompanyId: string;
  /** Mill / wholesaler name; null when hidden from this viewer until their carrier books. */
  shipperCompanyName: string | null;
  offeredRateUsd: number | null;
  createdAt: string;
  booking: null | {
    carrierCompanyId: string;
    agreedRateUsd: number;
    carrierCompany: { legalName: string };
  };
  dispatchLink: null | { token: string; status: string };
};

export type BoardActor = {
  userId: string | null;
  companyId: string | null;
  role: string | null;
  carrierApproved: boolean;
};

const emptyCreate = {
  originCity: "",
  originState: "",
  originZip: "",
  destinationCity: "",
  destinationState: "",
  destinationZip: "",
  weightLbs: "",
  equipmentType: "Dry van",
  isRush: false,
  offeredRateUsd: "",
};

function fmtUsd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function ageLabel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "<1h";
  if (h < 72) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function equipmentCode(eq: string) {
  const e = eq.toLowerCase();
  if (e.includes("flat")) return "FB";
  if (e.includes("dry") || e.includes("van")) return "V";
  if (e.includes("reef")) return "R";
  if (e.includes("step")) return "SD";
  if (e.includes("hot")) return "HS";
  return eq.slice(0, 2).toUpperCase();
}

function postedDateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

type BoardStats = LobSidebarStats;

export function LoadBoardWorkspace({
  loads,
  actor,
  stats,
}: {
  loads: SerializableLoad[];
  actor: BoardActor;
  stats: BoardStats;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [create, setCreate] = useState(emptyCreate);
  const [bookRate, setBookRate] = useState<Record<string, string>>({});
  const [dispatchForm, setDispatchForm] = useState<Record<string, { driverName: string; hours: string }>>({});

  const [originQ, setOriginQ] = useState("");
  const [destQ, setDestQ] = useState("");
  const [dhOrigin, setDhOrigin] = useState("150");
  const [dhDest, setDhDest] = useState("150");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [weightMin, setWeightMin] = useState("");
  const [weightMax, setWeightMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const isShipper = actor.role === "SHIPPER" && Boolean(actor.companyId);
  const isDispatcher = actor.role === "DISPATCHER" && Boolean(actor.companyId) && actor.carrierApproved;

  const filteredLoads = useMemo(() => {
    return loads.filter((l) => {
      const o = `${l.originCity} ${l.originState} ${l.originZip}`.toLowerCase();
      const d = `${l.destinationCity} ${l.destinationState} ${l.destinationZip}`.toLowerCase();
      if (originQ.trim() && !o.includes(originQ.trim().toLowerCase())) return false;
      if (destQ.trim() && !d.includes(destQ.trim().toLowerCase())) return false;
      if (equipmentFilter && l.equipmentType.toLowerCase() !== equipmentFilter.toLowerCase()) return false;
      const min = Number(weightMin);
      if (weightMin.trim() && Number.isFinite(min) && l.weightLbs < min) return false;
      const max = Number(weightMax);
      if (weightMax.trim() && Number.isFinite(max) && l.weightLbs > max) return false;
      const t = new Date(l.createdAt).getTime();
      if (dateFrom) {
        const start = new Date(dateFrom).setHours(0, 0, 0, 0);
        if (t < start) return false;
      }
      if (dateTo) {
        const end = new Date(dateTo).setHours(23, 59, 59, 999);
        if (t > end) return false;
      }
      return true;
    });
  }, [loads, originQ, destQ, equipmentFilter, weightMin, weightMax, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const withRate = filteredLoads.filter((l) => l.offeredRateUsd != null || l.booking);
    const sum = withRate.reduce((acc, l) => {
      const r = l.booking ? l.booking.agreedRateUsd : (l.offeredRateUsd ?? 0);
      return acc + r;
    }, 0);
    const avg = withRate.length ? sum / withRate.length : null;
    return { count: filteredLoads.length, avgPostedOrBooked: avg };
  }, [filteredLoads]);

  function swapOriginDest() {
    const t = originQ;
    setOriginQ(destQ);
    setDestQ(t);
  }

  async function refresh(msg: string) {
    setMessage(msg);
    router.refresh();
  }

  async function postLoad(e: React.FormEvent) {
    e.preventDefault();
    setBusyId("create");
    const w = Number(create.weightLbs);
    if (!Number.isFinite(w) || w <= 0) {
      setMessage("Weight must be a positive number.");
      setBusyId(null);
      return;
    }
    const body = {
      originCity: create.originCity.trim(),
      originState: create.originState.trim(),
      originZip: create.originZip.trim(),
      destinationCity: create.destinationCity.trim(),
      destinationState: create.destinationState.trim(),
      destinationZip: create.destinationZip.trim(),
      weightLbs: w,
      equipmentType: create.equipmentType.trim(),
      isRush: create.isRush,
      isPrivate: false,
      ...(create.offeredRateUsd.trim() ? { offeredRateUsd: Number(create.offeredRateUsd) } : {}),
    };
    const res = await fetch("/api/loads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Could not create load.");
      return;
    }
    setCreate(emptyCreate);
    setPostOpen(false);
    await refresh(`Posted ${data.data?.referenceNumber ?? "load"}.`);
  }

  async function bookLoad(loadId: string) {
    const rate = Number(bookRate[loadId] ?? "");
    if (!Number.isFinite(rate) || rate <= 0) {
      setMessage("Enter a valid agreed rate (USD).");
      return;
    }
    setBusyId(loadId);
    const res = await fetch(`/api/loads/${loadId}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agreedRateUsd: rate }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Book failed.");
      return;
    }
    await refresh("Booked.");
  }

  async function dispatchLoad(loadId: string) {
    const d = dispatchForm[loadId] ?? { driverName: "", hours: "48" };
    if (!d.driverName.trim()) {
      setMessage("Driver name is required.");
      return;
    }
    const hours = Number(d.hours) || 48;
    setBusyId(`d-${loadId}`);
    const res = await fetch(`/api/loads/${loadId}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverName: d.driverName.trim(),
        expiresInHours: hours,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error ?? "Dispatch failed.");
      return;
    }
    const path = data.driverViewUrl as string;
    const absolute =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    await refresh(`Driver link: ${absolute}`);
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard.");
  }

  return (
    <div className="mx-auto flex max-w-[1600px] gap-0 rounded-lg border border-zinc-200 bg-white shadow-sm lg:gap-0">
      <LobSidebar active="loads" stats={stats} />

      <div className="min-w-0 flex-1">
        {message && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">{message}</div>
        )}

        {/* Search header */}
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-zinc-700">
              {originQ || "Any origin"} → {destQ || "Any destination"}
            </span>
            <span className="text-xs text-zinc-500">
              {summary.count} result{summary.count !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Origin
                </label>
                <input
                  value={originQ}
                  onChange={(e) => setOriginQ(e.target.value)}
                  placeholder="City, ST or ZIP"
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-medium text-zinc-400">DH-O</span>
                  <input
                    value={dhOrigin}
                    onChange={(e) => setDhOrigin(e.target.value)}
                    className="w-16 rounded border border-zinc-200 px-2 py-0.5 text-xs"
                    title="Deadhead origin (display only for now)"
                  />
                  <span className="text-[10px] text-zinc-400">mi</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Destination
                </label>
                <input
                  value={destQ}
                  onChange={(e) => setDestQ(e.target.value)}
                  placeholder="City, ST or ZIP"
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-medium text-zinc-400">DH-D</span>
                  <input
                    value={dhDest}
                    onChange={(e) => setDhDest(e.target.value)}
                    className="w-16 rounded border border-zinc-200 px-2 py-0.5 text-xs"
                    title="Deadhead destination (display only for now)"
                  />
                  <span className="text-[10px] text-zinc-400">mi</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center py-2">
              <button
                type="button"
                onClick={swapOriginDest}
                className="rounded-full border border-zinc-300 bg-white p-2 text-zinc-600 shadow-sm hover:bg-zinc-100"
                title="Swap origin and destination"
                aria-label="Swap origin and destination"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Equipment</label>
                <select
                  value={equipmentFilter}
                  onChange={(e) => setEquipmentFilter(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-2 py-2 text-sm"
                >
                  <option value="">All types</option>
                  <option>Dry van</option>
                  <option>Flatbed</option>
                  <option>Reefer</option>
                  <option>Step deck</option>
                  <option>Hotshot</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Weight min (lbs)</label>
                <input
                  value={weightMin}
                  onChange={(e) => setWeightMin(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-2 py-2 text-sm"
                  placeholder="Any"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Weight max (lbs)</label>
                <input
                  value={weightMax}
                  onChange={(e) => setWeightMax(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-2 py-2 text-sm"
                  placeholder="Any"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Posted from</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-2 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Posted to</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-2 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-700"
            >
              SEARCH
            </button>
            {isShipper && (
              <button
                type="button"
                onClick={() => setPostOpen((v) => !v)}
                className="rounded border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                {postOpen ? "Close post form" : "+ Post load"}
              </button>
            )}
            {isDispatcher && (
              <span className="text-xs text-zinc-600">
                Book an open load, then send the driver their link.
              </span>
            )}
          </div>
        </div>

        {/* Post form (shipper) */}
        {isShipper && postOpen && (
          <div className="border-b border-emerald-200 bg-emerald-50/80 px-4 py-4">
            <h3 className="text-sm font-semibold text-emerald-900">Post a shipment</h3>
            <form className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" onSubmit={postLoad}>
              <input
                className="rounded border px-2 py-2 text-sm"
                placeholder="Origin city"
                value={create.originCity}
                onChange={(e) => setCreate((c) => ({ ...c, originCity: e.target.value }))}
                required
              />
              <input
                className="rounded border px-2 py-2 text-sm"
                placeholder="Origin ST"
                maxLength={2}
                value={create.originState}
                onChange={(e) => setCreate((c) => ({ ...c, originState: e.target.value }))}
                required
              />
              <input
                className="rounded border px-2 py-2 text-sm"
                placeholder="Origin ZIP"
                value={create.originZip}
                onChange={(e) => setCreate((c) => ({ ...c, originZip: e.target.value }))}
                required
              />
              <input
                className="rounded border px-2 py-2 text-sm"
                placeholder="Destination city"
                value={create.destinationCity}
                onChange={(e) => setCreate((c) => ({ ...c, destinationCity: e.target.value }))}
                required
              />
              <input
                className="rounded border px-2 py-2 text-sm"
                placeholder="Dest ST"
                maxLength={2}
                value={create.destinationState}
                onChange={(e) => setCreate((c) => ({ ...c, destinationState: e.target.value }))}
                required
              />
              <input
                className="rounded border px-2 py-2 text-sm"
                placeholder="Dest ZIP"
                value={create.destinationZip}
                onChange={(e) => setCreate((c) => ({ ...c, destinationZip: e.target.value }))}
                required
              />
              <input
                className="rounded border px-2 py-2 text-sm"
                placeholder="Weight lbs"
                value={create.weightLbs}
                onChange={(e) => setCreate((c) => ({ ...c, weightLbs: e.target.value }))}
                required
              />
              <select
                className="rounded border px-2 py-2 text-sm"
                value={create.equipmentType}
                onChange={(e) => setCreate((c) => ({ ...c, equipmentType: e.target.value }))}
              >
                <option>Dry van</option>
                <option>Flatbed</option>
                <option>Reefer</option>
                <option>Step deck</option>
                <option>Hotshot</option>
              </select>
              <input
                className="rounded border px-2 py-2 text-sm"
                placeholder="Offered rate USD (optional)"
                value={create.offeredRateUsd}
                onChange={(e) => setCreate((c) => ({ ...c, offeredRateUsd: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
                <input
                  type="checkbox"
                  checked={create.isRush}
                  onChange={(e) => setCreate((c) => ({ ...c, isRush: e.target.checked }))}
                />
                Rush
              </label>
              <button
                type="submit"
                disabled={busyId === "create"}
                className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 lg:col-span-3"
              >
                {busyId === "create" ? "Publishing…" : "Publish to board"}
              </button>
            </form>
          </div>
        )}

        {/* Lane summary strip */}
        <div className="flex flex-wrap items-center gap-6 border-b border-zinc-200 bg-white px-4 py-3 text-sm">
          <div>
            <span className="text-zinc-500">Lane avg (posted / booked)</span>{" "}
            <span className="font-semibold text-zinc-900">
              {summary.avgPostedOrBooked != null ? fmtUsd(summary.avgPostedOrBooked) : "—"}
            </span>
          </div>
          <div className="h-4 w-px bg-zinc-200" />
          <div>
            <span className="text-zinc-500">Delivered (all)</span>{" "}
            <span className="font-semibold">{stats.delivered}</span>
          </div>
          <div className="text-xs text-zinc-400">
            Trip miles & deadhead search filters can tie to routing data in a later release.
          </div>
        </div>

        {/* Results table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-100 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                <th className="whitespace-nowrap px-2 py-2">Ref</th>
                <th className="whitespace-nowrap px-2 py-2">Age</th>
                <th className="whitespace-nowrap px-2 py-2">Rate</th>
                <th className="whitespace-nowrap px-2 py-2">Trip</th>
                <th className="whitespace-nowrap px-2 py-2">Origin</th>
                <th className="whitespace-nowrap px-2 py-2">Dest</th>
                <th className="whitespace-nowrap px-2 py-2">Posted</th>
                <th className="whitespace-nowrap px-2 py-2">EQ</th>
                <th className="whitespace-nowrap px-2 py-2">Weight</th>
                <th className="min-w-[120px] px-2 py-2" title="Hidden on the open board until your company books the load.">
                  Mill / customer
                </th>
                <th className="whitespace-nowrap px-2 py-2">Status</th>
                <th className="min-w-[200px] px-2 py-2">Carrier / actions</th>
              </tr>
            </thead>
            <tbody className="text-zinc-800">
              {filteredLoads.map((load) => {
                const displayRate = load.booking
                  ? load.booking.agreedRateUsd
                  : (load.offeredRateUsd ?? null);
                return (
                  <tr
                    key={load.id}
                    className="border-b border-zinc-100 hover:bg-sky-50/40"
                  >
                    <td className="whitespace-nowrap px-2 py-2">
                      <Link
                        href={`/loads/${load.id}`}
                        className="font-semibold text-sky-700 underline decoration-sky-300 hover:text-sky-900"
                      >
                        {load.referenceNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-medium text-zinc-600">
                      {ageLabel(load.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-semibold">{fmtUsd(displayRate)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-zinc-400">—</td>
                    <td className="px-2 py-2">
                      <div className="font-medium">
                        {load.originCity}, {load.originState}
                      </div>
                      <div className="text-[10px] text-zinc-500">{load.originZip}</div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium">
                        {load.destinationCity}, {load.destinationState}
                      </div>
                      <div className="text-[10px] text-zinc-500">{load.destinationZip}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{postedDateLabel(load.createdAt)}</td>
                    <td className="whitespace-nowrap px-2 py-2" title={load.equipmentType}>
                      {equipmentCode(load.equipmentType)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{load.weightLbs.toLocaleString()}</td>
                    <td
                      className="max-w-[160px] px-2 py-2 text-zinc-700"
                      title={
                        load.shipperCompanyName ??
                        "Not shown on the open board. After you book, the mill or wholesaler name appears here."
                      }
                    >
                      {load.shipperCompanyName ? (
                        <span className="block truncate font-medium">{load.shipperCompanyName}</span>
                      ) : (
                        <span className="text-zinc-400 italic">Private until booked</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <span
                        className={
                          load.status === "POSTED"
                            ? "rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-900"
                            : load.status === "BOOKED"
                              ? "rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-900"
                              : "text-[10px] text-zinc-600"
                        }
                      >
                        {load.status}
                      </span>
                      {load.isRush && (
                        <span className="ml-1 text-[10px] font-bold text-amber-600">RUSH</span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="space-y-2 text-[11px]">
                        <div className="text-zinc-600">{load.booking?.carrierCompany.legalName ?? "—"}</div>
                        {load.status === "POSTED" && isDispatcher && (
                          <div className="flex flex-wrap items-center gap-1">
                            <input
                              className="w-20 rounded border px-1 py-0.5"
                              placeholder="$"
                              value={bookRate[load.id] ?? ""}
                              onChange={(e) => setBookRate((m) => ({ ...m, [load.id]: e.target.value }))}
                            />
                            <button
                              type="button"
                              disabled={busyId === load.id}
                              className="rounded bg-sky-600 px-2 py-0.5 font-semibold text-white disabled:opacity-50"
                              onClick={() => bookLoad(load.id)}
                            >
                              Book
                            </button>
                          </div>
                        )}
                        {load.status === "BOOKED" &&
                          load.booking?.carrierCompanyId === actor.companyId &&
                          isDispatcher &&
                          !load.dispatchLink && (
                            <div className="space-y-1 rounded border border-purple-200 bg-purple-50/90 p-2">
                              <input
                                className="mb-1 w-full rounded border px-1 py-0.5"
                                placeholder="Driver name"
                                value={dispatchForm[load.id]?.driverName ?? ""}
                                onChange={(e) =>
                                  setDispatchForm((m) => ({
                                    ...m,
                                    [load.id]: {
                                      driverName: e.target.value,
                                      hours: m[load.id]?.hours ?? "48",
                                    },
                                  }))
                                }
                              />
                              <div className="flex gap-1">
                                <input
                                  className="w-14 rounded border px-1 py-0.5"
                                  placeholder="Hrs"
                                  value={dispatchForm[load.id]?.hours ?? "48"}
                                  onChange={(e) =>
                                    setDispatchForm((m) => ({
                                      ...m,
                                      [load.id]: {
                                        driverName: m[load.id]?.driverName ?? "",
                                        hours: e.target.value,
                                      },
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  disabled={busyId === `d-${load.id}`}
                                  className="rounded bg-purple-700 px-2 py-0.5 text-white disabled:opacity-50"
                                  onClick={() => dispatchLoad(load.id)}
                                >
                                  Driver link
                                </button>
                              </div>
                            </div>
                          )}
                        {load.dispatchLink && (
                          <div>
                            <button
                              type="button"
                              className="text-sky-700 underline"
                              onClick={() =>
                                copyText(
                                  `${typeof window !== "undefined" ? window.location.origin : ""}/driver/${load.dispatchLink!.token}`,
                                )
                              }
                            >
                              Copy driver URL
                            </button>
                            {load.uniquePickupCode && (
                              <div className="text-amber-800">Code {load.uniquePickupCode}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredLoads.length === 0 && (
            <p className="p-8 text-center text-sm text-zinc-500">
              No loads match these filters. Clear search or post a shipment as a shipper.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
