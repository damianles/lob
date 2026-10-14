import Link from "next/link";
import type { ReactNode } from "react";

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
    supplierDeliveredAt?: string | null;
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
  const needsRepost = load.status === "NEEDS_REPOST";
  const isBooked = Boolean(booking);

  if (needsRepost) {
    return (
      <ol className="mt-4 space-y-0 border-l-2 border-amber-200 pl-4">
        <TimelineRow
          index={1}
          label="Posted on board"
          detail={fmt(load.createdAt)}
          complete
        />
        <TimelineRow
          index={2}
          label="Needs repost"
          detail="Off the board until you accept with new dates or decline (unlist)"
          active
        />
      </ol>
    );
  }

  if (!isBooked) {
    return (
      <ol className="mt-4 space-y-0 border-l-2 border-zinc-200 pl-4">
        <TimelineRow
          index={1}
          label="Posted on board"
          detail={fmt(load.createdAt)}
          complete
        />
        <TimelineRow
          index={2}
          label="Awaiting booking"
          detail="Not booked yet — a carrier must book or you must accept a bid"
          active
        />
      </ol>
    );
  }

  const s3 = Boolean(dispatch);
  const s4 = Boolean(dispatch?.pickupConfirmedAt);
  const s5 = Boolean(dispatch?.deliveredAt);
  const s6 = Boolean(dispatch?.supplierDeliveredAt);
  const done = [true, true, s3, s4, s5, s6];
  const firstOpen = done.findIndex((d) => !d);

  const rows = [
    {
      key: "posted",
      label: "Posted on board",
      detail: fmt(load.createdAt),
      stepDone: true,
    },
    {
      key: "booked",
      label: "Booked by carrier",
      detail: fmt(booking!.bookedAt),
      stepDone: true,
    },
    {
      key: "dispatch",
      label: "Driver link created",
      detail: dispatch ? fmt(dispatch.createdAt) : "Carrier creates the driver link",
      stepDone: s3,
      extra: dispatch ? (
        <Link href={`/driver/${dispatch.token}`} className="font-medium text-lob-navy underline">
          Open driver page
        </Link>
      ) : null,
    },
    {
      key: "pickup",
      label: "Picked up",
      detail: dispatch?.pickupConfirmedAt
        ? fmt(dispatch.pickupConfirmedAt)
        : "Carrier checks in when the truck leaves origin",
      stepDone: s4,
    },
    {
      key: "carrierDelivered",
      label: "Carrier delivered",
      detail: dispatch?.deliveredAt
        ? fmt(dispatch.deliveredAt)
        : "Carrier uploads signed BOL, then marks delivered",
      stepDone: s5,
    },
    {
      key: "supplierDelivered",
      label: "Supplier confirmed complete",
      detail: dispatch?.supplierDeliveredAt
        ? fmt(dispatch.supplierDeliveredAt)
        : "Supplier confirms the load is complete",
      stepDone: s6,
    },
  ];

  return (
    <ol className="mt-4 space-y-0 border-l-2 border-zinc-200 pl-4">
      {rows.map((r, i) => {
        const active = firstOpen !== -1 && i === firstOpen;
        return (
          <TimelineRow
            key={r.key}
            index={i + 1}
            label={r.label}
            detail={r.detail}
            complete={r.stepDone}
            active={active}
            extra={r.extra}
          />
        );
      })}
    </ol>
  );
}

function TimelineRow({
  index,
  label,
  detail,
  complete,
  active,
  extra,
}: {
  index: number;
  label: string;
  detail: string;
  complete?: boolean;
  active?: boolean;
  extra?: ReactNode;
}) {
  return (
    <li className="relative pb-6 pl-2 last:pb-0">
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
        {index}. {label}
      </p>
      <p className="mt-0.5 text-xs text-zinc-600">{detail}</p>
      {extra ? <p className="mt-1 text-xs">{extra}</p> : null}
    </li>
  );
}
