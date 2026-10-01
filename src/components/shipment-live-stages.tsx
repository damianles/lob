type Stage = {
  key: string;
  label: string;
  done: boolean;
  at: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ShipmentLiveStages({
  postedAt,
  bookedAt,
  pickupConfirmedAt,
  deliveredAt,
  supplierDeliveredAt,
  cancelled,
  compact = false,
}: {
  postedAt: string;
  bookedAt: string | null;
  pickupConfirmedAt: string | null;
  deliveredAt: string | null;
  supplierDeliveredAt?: string | null;
  cancelled?: boolean;
  compact?: boolean;
}) {
  if (cancelled) {
    return (
      <p className={compact ? "text-[11px] font-medium text-zinc-500" : "text-sm font-medium text-zinc-600"}>
        Cancelled
      </p>
    );
  }

  const mutual = Boolean(deliveredAt && supplierDeliveredAt);
  const stages: Stage[] = [
    { key: "posted", label: "Posted", done: true, at: postedAt },
    { key: "booked", label: "Booked", done: Boolean(bookedAt), at: bookedAt },
    { key: "pickedUp", label: "Picked up", done: Boolean(pickupConfirmedAt), at: pickupConfirmedAt },
    {
      key: "delivered",
      label: mutual ? "Complete" : "Delivered",
      done: Boolean(deliveredAt || supplierDeliveredAt),
      at: deliveredAt ?? supplierDeliveredAt ?? null,
    },
  ];

  const firstOpen = stages.findIndex((s) => !s.done);

  return (
    <ol
      className={
        compact
          ? "flex min-w-[220px] flex-wrap items-center gap-x-1 gap-y-1"
          : "flex flex-wrap items-stretch gap-2"
      }
      aria-label="Shipment live stages"
    >
      {stages.map((s, i) => {
        const active = firstOpen === i;
        const stamp = fmt(s.at);
        return (
          <li key={s.key} className="flex items-center gap-1">
            {i > 0 ? (
              <span
                className={`mx-0.5 h-px w-3 ${s.done || active ? "bg-emerald-500" : "bg-stone-300"}`}
                aria-hidden
              />
            ) : null}
            <span
              className={
                compact
                  ? `inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${
                      s.done
                        ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                        : active
                          ? "bg-amber-50 text-amber-950 ring-amber-300"
                          : "bg-stone-50 text-stone-400 ring-stone-200"
                    }`
                  : `inline-flex min-w-[5.5rem] flex-col rounded-md px-2.5 py-1.5 ring-1 ${
                      s.done
                        ? "bg-emerald-50 text-emerald-950 ring-emerald-200"
                        : active
                          ? "bg-amber-50 text-amber-950 ring-amber-300"
                          : "bg-stone-50 text-stone-400 ring-stone-200"
                    }`
              }
            >
              <span className={compact ? undefined : "text-xs font-semibold"}>{s.label}</span>
              {!compact ? (
                <span className="mt-0.5 text-[10px] font-normal tabular-nums text-current/80">
                  {s.done && stamp ? stamp : active ? "Waiting" : "—"}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
