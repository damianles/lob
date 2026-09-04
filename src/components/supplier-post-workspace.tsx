"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";

import { scrollWindowToTop } from "@/components/scroll-to-top";

import { LobBrandStrip } from "@/components/lob-brand-strip";
import { LobSidebar } from "@/components/lob-sidebar";
import { LoadTemplatesPanel, type LoadTemplate } from "@/components/load-templates-panel";
import { RecentPostsPicker } from "@/components/recent-posts-picker";
import { SavedLanesPanel, type SavedLane } from "@/components/saved-lanes-panel";
import { SupplierPostLoadForm } from "@/components/supplier-post-load-form";

type Step =
  | { kind: "choose" }
  | { kind: "pick-lane" }
  | { kind: "adjust-prompt"; template: LoadTemplate }
  | { kind: "recent" }
  | {
      kind: "form";
      seedLane?: SavedLane | null;
      seedTemplate?: LoadTemplate | null;
      /** Always clear dates when coming from saved lane with products / recent. */
      clearDates?: boolean;
      banner?: string;
    };

/**
 * Supplier Post a Load workspace — entry chooser then the full form.
 * Kept separate from the Loads list so posting stays focused.
 */
export function SupplierPostWorkspace({ companyName }: { companyName: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "choose" });

  useLayoutEffect(() => {
    scrollWindowToTop();
  }, [step.kind]);

  function goHome(msg?: string) {
    if (msg) {
      router.push(`/shipments?posted=${encodeURIComponent(msg)}`);
      return;
    }
    router.push("/shipments");
  }

  return (
    <div className="mx-auto flex max-w-[1680px] gap-0 overflow-hidden rounded-[1.25rem] border border-stone-200/35 bg-white shadow-[0_2px_40px_-12px_rgba(0,18,51,0.07)]">
      <LobSidebar active="shipments" />
      <div className="min-w-0 flex-1 overflow-x-hidden bg-stone-50/40">
        <LobBrandStrip />
        <div className="px-4 py-6 sm:px-8 sm:py-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                <Link href="/shipments" className="hover:text-lob-navy hover:underline">
                  {companyName ? `${companyName} Shipments` : "Shipments"}
                </Link>
                <span className="mx-1.5 text-stone-300">/</span>
                Post
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">Post a Load</h1>
              <p className="mt-1 max-w-xl text-sm text-zinc-600">
                Pick how you want to start — then fill only what this shipment needs.
              </p>
            </div>
            <Link
              href="/shipments"
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Back to shipments
            </Link>
          </div>

          {step.kind === "choose" && (
            <div className="mx-auto max-w-2xl space-y-4">
              <button
                type="button"
                onClick={() => setStep({ kind: "pick-lane" })}
                className="flex w-full flex-col items-start rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition hover:border-lob-navy/30 hover:shadow-md"
              >
                <span className="text-base font-semibold text-lob-navy">Saved Lanes</span>
                <span className="mt-1 text-sm text-stone-600">
                  Reuse addresses only, or a lane that also includes products. Dates are always entered fresh.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStep({ kind: "form", banner: "Starting blank — enter lane, product, dates, and rate." })}
                className="flex w-full flex-col items-start rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 p-5 text-left transition hover:border-stone-400 hover:bg-white"
              >
                <span className="text-base font-semibold text-stone-800">Start Blank</span>
                <span className="mt-1 text-sm text-stone-600">Enter everything from scratch for this load.</span>
              </button>
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setStep({ kind: "recent" })}
                  className="text-sm font-medium text-lob-navy underline hover:no-underline"
                >
                  Recent Posts
                </button>
              </div>
            </div>
          )}

          {step.kind === "pick-lane" && (
            <div className="mx-auto max-w-xl space-y-4">
              <button
                type="button"
                onClick={() => setStep({ kind: "choose" })}
                className="text-sm font-medium text-lob-navy underline hover:no-underline"
              >
                ← Back
              </button>
              <SavedLanesPanel
                variant="picker"
                onPick={(lane) =>
                  setStep({
                    kind: "form",
                    seedLane: lane,
                    banner: "Lane addresses loaded. Add product, dates, and rate.",
                  })
                }
                getCurrentLane={() => ({
                  originCity: "",
                  originState: "",
                  originZip: "",
                  destinationCity: "",
                  destinationState: "",
                  destinationZip: "",
                })}
              />
              <LoadTemplatesPanel
                variant="picker"
                onLoad={(t) => setStep({ kind: "adjust-prompt", template: t })}
                getCurrentSnapshot={() => ({
                  originCity: "",
                  originState: "",
                  originZip: "",
                  destinationCity: "",
                  destinationState: "",
                  destinationZip: "",
                  equipmentType: "",
                  weightLbs: "",
                  isRush: false,
                  isPrivate: false,
                  rateUsd: "",
                  currency: "CAD",
                  notes: "",
                  lumber: {},
                })}
              />
            </div>
          )}

          {step.kind === "adjust-prompt" && (
            <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Adjust load details?</h2>
              <p className="mt-2 text-sm text-zinc-600">
                <span className="font-medium text-zinc-800">{step.template.name}</span> will fill the form.
                Pickup and delivery dates are always blank so you set them for this shipment.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    setStep({
                      kind: "form",
                      seedTemplate: step.template,
                      clearDates: true,
                      banner: "Details loaded — review and change anything you need. Set dates below.",
                    })
                  }
                  className="rounded-lg bg-lob-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-lob-navy-hover"
                >
                  Yes, adjust details
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStep({
                      kind: "form",
                      seedTemplate: step.template,
                      clearDates: true,
                      banner: "Details loaded. Set pickup and delivery dates — other fields are ready to publish.",
                    })
                  }
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
                >
                  Just set dates
                </button>
              </div>
              <button
                type="button"
                onClick={() => setStep({ kind: "pick-lane" })}
                className="mt-4 text-sm text-lob-navy underline hover:no-underline"
              >
                Pick a different saved lane
              </button>
            </div>
          )}

          {step.kind === "recent" && (
            <div className="mx-auto max-w-xl space-y-4">
              <button
                type="button"
                onClick={() => setStep({ kind: "choose" })}
                className="text-sm font-medium text-lob-navy underline hover:no-underline"
              >
                ← Back
              </button>
              <RecentPostsPicker
                onLoad={(t) =>
                  setStep({
                    kind: "form",
                    seedTemplate: t,
                    clearDates: true,
                    banner: "Recent post loaded. Set new dates and confirm details before publishing.",
                  })
                }
              />
            </div>
          )}

          {step.kind === "form" && (
            <div className="mx-auto max-w-3xl">
              <button
                type="button"
                onClick={() => setStep({ kind: "choose" })}
                className="mb-3 text-sm font-medium text-lob-navy underline hover:no-underline"
              >
                ← Change how you start
              </button>
              {step.banner && (
                <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  {step.banner}
                </p>
              )}
              <SupplierPostLoadForm
                pageLayout
                showEntryPanels={false}
                seedLane={step.seedLane ?? null}
                seedTemplate={step.seedTemplate ?? null}
                clearDatesOnSeed={Boolean(step.clearDates)}
                onCancel={() => goHome()}
                onPosted={(msg) => goHome(msg)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
