import Link from "next/link";

import { LobBrandHero } from "@/components/lob-brand-hero";

export function LandingEntry() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <LobBrandHero className="h-auto w-full rounded-lg border border-stone-200 shadow-sm" priority />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Link
          href="/sign-in?lob_intent=carrier"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-lob-navy px-6 text-sm font-semibold text-white shadow hover:bg-lob-navy-hover"
        >
          Sign in — Carrier
        </Link>
        <Link
          href="/sign-in?lob_intent=shipper"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-lob-navy bg-white px-6 text-sm font-semibold text-lob-navy shadow-sm hover:bg-lob-paper"
        >
          Sign in — Shipper
        </Link>
        <Link
          href="/sign-up?lob_intent=carrier"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-6 text-sm font-medium text-stone-800 hover:bg-stone-50"
        >
          Create account — Carrier
        </Link>
        <Link
          href="/sign-up?lob_intent=shipper"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-6 text-sm font-medium text-stone-800 hover:bg-stone-50"
        >
          Create account — Shipper
        </Link>
      </div>

      <section className="mt-12 space-y-6 text-stone-800">
        <h1 className="text-2xl font-bold tracking-tight text-lob-navy sm:text-3xl">The load board built for lumber</h1>
        <p className="text-base leading-relaxed text-stone-700">
          Lumber One Board connects <strong className="font-semibold text-stone-900">mills and suppliers</strong> who need
          trucks with <strong className="font-semibold text-stone-900">carriers and dispatchers</strong> who move
          dimensional lumber, panels, and bulk wood safely and on time. Post once, see fair-market guidance, and book
          with less phone tag.
        </p>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-stone-700 sm:text-base">
          <li>
            <strong className="text-stone-900">Shippers</strong> publish lanes with equipment, weight, pickup windows,
            and USD/CAD pricing. The open board hides your identity until a carrier books—competition sees freight, not
            your company name.
          </li>
          <li>
            <strong className="text-stone-900">Carriers</strong> search and filter loads, compare posted rates to
            benchmarks, and book in a few clicks. Verification keeps the marketplace serious for everyone.
          </li>
          <li>
            <strong className="text-stone-900">Dispatch &amp; drivers</strong> get a simple path from book → dispatch
            link → pickup confirmation and delivery—aligned with how your team already runs trucks.
          </li>
        </ul>
        <p className="rounded-lg border border-lob-gold/40 bg-white p-4 text-sm text-stone-700">
          After you sign in, finish <Link className="font-semibold text-lob-navy underline" href="/onboarding">account setup</Link>{" "}
          to link your mill or trucking company. Questions? Use{" "}
          <Link className="font-semibold text-lob-navy underline" href="/insights">
            Insights
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
