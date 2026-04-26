"use client";

import Link from "next/link";
import { useState } from "react";

import { CarrierTypeTag } from "@/components/carrier-type-tag";
import type { BoardActor, SerializableLoad } from "@/components/load-board-workspace";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { equipmentShortTag } from "@/lib/lumber-equipment";
import { summarizeLumberSpec } from "@/lib/lumber-spec";
import { formatMoney } from "@/lib/money";

interface LoadCardProps {
  load: SerializableLoad;
  actor: BoardActor;
  onBook?: (loadId: string, rate: number) => void;
  onDispatch?: (loadId: string, driverName: string, hours: number) => void;
  onCopyDriverLink?: (url: string) => void;
  busyId?: string | null;
}

function ageLabel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "<1h";
  if (h < 72) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function postedDateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    POSTED: "posted",
    BOOKED: "booked",
    ASSIGNED: "assigned",
    IN_TRANSIT: "in-transit",
    DELIVERED: "delivered",
    CANCELLED: "error",
  };
  return map[status] ?? "default";
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function LoadCard({
  load,
  actor,
  onBook,
  onDispatch,
  onCopyDriverLink,
  busyId,
}: LoadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [bookingRate, setBookingRate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [hours, setHours] = useState("48");

  const isShipper = actor.role === "SHIPPER" && actor.companyId === load.shipperCompanyId;
  const isDispatcher = actor.role === "DISPATCHER" && Boolean(actor.companyId) && actor.carrierApproved;
  const canBook = isDispatcher && load.status === "POSTED";
  const canDispatch =
    isDispatcher &&
    load.status === "BOOKED" &&
    load.booking?.carrierCompanyId === actor.companyId &&
    !load.dispatchLink;

  const displayRate = load.booking ? load.booking.agreedRateUsd : (load.offeredRateUsd ?? null);
  const rateCurrency = load.booking ? load.booking.agreedCurrency : load.offerCurrency;
  const specPills = summarizeLumberSpec(load.lumberSpec);

  return (
    <Card
      hover
      interactive
      onClick={() => setExpanded((v) => !v)}
      className="w-full min-w-0 max-w-full transition-all duration-200 border-l-4 border-l-lob-navy/70 hover:border-l-lob-navy"
    >
      <CardBody className="py-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/loads/${load.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-lg font-semibold text-lob-navy hover:underline block truncate"
            >
              {load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}
            </Link>
            <p className="text-xs text-stone-500 mt-0.5">{load.referenceNumber}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant={statusBadgeVariant(load.status)} pulse={load.status === "IN_TRANSIT"}>
              {formatStatusLabel(load.status)}
            </Badge>
            {load.isRush && (
              <Badge variant="rush" className="text-[10px]">
                RUSH
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-lob-navy">
              {displayRate !== null ? formatMoney(displayRate, rateCurrency) : "—"}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">Posted {ageLabel(load.createdAt)} ago</p>
          </div>
          <div className="text-right text-xs text-stone-600">
            <div>Pickup: {postedDateLabel(load.requestedPickupAt)}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 mb-3">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
              />
            </svg>
            <span title={load.equipmentType}>{equipmentShortTag(load.equipmentType)}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
            <span>{load.weightLbs.toLocaleString()} lbs</span>
          </div>
          <div className="text-stone-500">
            {load.originZip} → {load.destinationZip}
          </div>
        </div>

        {specPills.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {specPills.map((p, i) => (
              <span
                key={`${p}-${i}`}
                className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700 ring-1 ring-stone-200"
              >
                {p}
              </span>
            ))}
          </div>
        )}

        {load.shipperCompanyName && (
          <div className="text-xs text-stone-600 mb-3">
            {isShipper ? "You posted this load" : `Shipper: ${load.shipperCompanyName}`}
          </div>
        )}
        {load.booking && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-600">
            <span>Carrier: {load.booking.carrierCompany.legalName || "Booked"}</span>
            <CarrierTypeTag
              carrierType={load.booking.carrierCompany.carrierType}
              isOwnerOperator={load.booking.carrierCompany.isOwnerOperator}
              compact
            />
          </div>
        )}

        {(canBook || canDispatch || load.dispatchLink) && (
          <div
            className={`
              overflow-hidden transition-all duration-300
              ${expanded ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-4 border-t border-stone-100 space-y-3">
              {canBook && onBook && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={`Rate (${load.offerCurrency})`}
                    value={bookingRate}
                    onChange={(e) => setBookingRate(e.target.value)}
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    size="sm"
                    disabled={busyId === load.id}
                    isLoading={busyId === load.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rate = Number(bookingRate);
                      if (rate > 0) onBook(load.id, rate);
                    }}
                  >
                    Book
                  </Button>
                </div>
              )}

              {canDispatch && onDispatch && (
                <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <input
                    type="text"
                    placeholder="Driver name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Hours"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-20 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === `d-${load.id}`}
                      isLoading={busyId === `d-${load.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const h = Number(hours) || 48;
                        if (driverName.trim()) onDispatch(load.id, driverName.trim(), h);
                      }}
                    >
                      Create driver link
                    </Button>
                  </div>
                </div>
              )}

              {load.dispatchLink && onCopyDriverLink && (
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/driver/${load.dispatchLink!.token}`;
                      onCopyDriverLink(url);
                    }}
                  >
                    Copy driver URL
                  </Button>
                  {load.uniquePickupCode && (
                    <p className="text-xs text-amber-800 mt-2">
                      Pickup code: <span className="font-mono font-semibold">{load.uniquePickupCode}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {(canBook || canDispatch || load.dispatchLink) && (
          <div className="mt-3 text-center">
            <svg
              className={`w-5 h-5 mx-auto text-stone-400 transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
