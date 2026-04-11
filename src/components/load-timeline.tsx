import Link from "next/link";

type Props = {
  load: {
    status: string;
    createdAt: string;
    uniquePickupCode: string | null;
  };
  booking: null | { bookedAt: string };
  dispatch: null | {
    createdAt: string;
    pickupConfirmedAt: string | null;
    deliveredAt: string | null;
    status: string;
    token: string;
  };
};

function fmt(iso: string) {
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

export function LoadTimeline({ load, booking, dispatch }: Props) {
  const s1 = true;
  const s2 = Boolean(booking);
  const s3 = Boolean(dispatch);
  const s4 = Boolean(dispatch?.pickupConfirmedAt);
  const s5 = load.status === "DELIVERED" || Boolean(dispatch?.deliveredAt);

  const done = [s1, s2, s3, s4, s5];
  const firstOpen = done.findIndex((d) => !d);

  const rows = [
    {
      key: "posted",
      label: "Posted on board",
      detail: fmt(load.createdAt),
      stepDone: s1,
    },
    {
      key: "booked",
      label: "Booked by carrier",
      detail: booking ? fmt(booking.bookedAt) : "Not booked yet",
      stepDone: s2,
    },
    {
      key: "dispatch",
      label: "Driver link created",
      detail: dispatch ? fmt(dispatch.createdAt) : booking ? "Create link from load board" : "—",
      stepDone: s3,
      extra: dispatch ? (
        <Link href={`/driver/${dispatch.token}`} className="font-medium text-lob-navy underline">
          Open driver page
        </Link>
      ) : null,
    },
    {
      key: "pickup",
      label: "Pickup confirmed",
      detail: dispatch?.pickupConfirmedAt
        ? fmt(dispatch.pickupConfirmedAt)
        : load.uniquePickupCode
          ? `Driver enters code ${load.uniquePickupCode} on driver page`
          : "Driver confirms pickup with mill code",
      stepDone: s4,
    },
    {
      key: "delivered",
      label: "Delivered (POD)",
      detail: dispatch?.deliveredAt ? fmt(dispatch.deliveredAt) : "Driver uploads POD",
      stepDone: s5,
    },
  ];

  return (
    <ol className="mt-4 space-y-0 border-l-2 border-zinc-200 pl-4">
      {rows.map((r, i) => {
        const active = firstOpen !== -1 && i === firstOpen;
        const complete = r.stepDone;
        return (
          <li key={r.key} className="relative pb-6 pl-2 last:pb-0">
            <span
              className={`absolute -left-[21px] top-1 flex h-3 w-3 rounded-full border-2 border-white ${
                complete
                  ? "bg-emerald-600"
                  : active
                    ? "bg-lob-gold ring-2 ring-lob-gold/40"
                    : "bg-stone-300"
              }`}
              aria-hidden
            />
            <p className={`text-sm font-semibold ${complete || active ? "text-zinc-900" : "text-zinc-400"}`}>
              {i + 1}. {r.label}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">{r.detail}</p>
            {r.extra && <p className="mt-1 text-xs">{r.extra}</p>}
          </li>
        );
      })}
    </ol>
  );
}
