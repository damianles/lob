"use client";

import Link from "next/link";

import { useViewerRole } from "@/components/providers/app-providers";

export function CapacityPageIntro() {
  const { viewer, loading } = useViewerRole();
  const isSupplier = !loading && viewer.kind === "SHIPPER";

  return (
    <p className="mt-2 max-w-2xl text-sm text-zinc-600">
      Carriers publish available trucks by lane and date window. Suppliers search without seeing carrier names on the
      open board.
      {isSupplier ? (
        <>
          {" "}
          Use{" "}
          <Link className="font-medium text-lob-navy underline" href="/shipper/carrier-preferences">
            Carrier preferences
          </Link>{" "}
          to hide carriers you never want to book.{" "}
        </>
      ) : (
        " "
      )}
      Booked freight and dispatch stay on the{" "}
      <Link className="font-medium text-lob-navy underline" href="/booked">
        Booked freight
      </Link>{" "}
      page.
    </p>
  );
}
