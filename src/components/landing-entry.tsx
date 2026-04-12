import Link from "next/link";

import { LobBrandHero } from "@/components/lob-brand-hero";
import {
  BRAND_EYEBROW,
  BRAND_POSITIONING,
  BRAND_PRODUCT_NAME,
  BRAND_PUNCH_LINES,
  BRAND_VALUE_PROPS,
} from "@/lib/brand-marketing";

export function LandingEntry() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(181,129,53,0.12),transparent)]" />
      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-lob-gold-muted">
          {BRAND_EYEBROW}
        </p>
        <h1 className="mt-3 text-center text-4xl font-semibold tracking-tight text-lob-navy sm:text-5xl sm:leading-[1.1]">
          {BRAND_POSITIONING}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-stone-600 sm:text-xl">
          {BRAND_PUNCH_LINES[0]}
        </p>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-stone-500">
          {BRAND_PUNCH_LINES[1]} {BRAND_PUNCH_LINES[2]}
        </p>

        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xl shadow-stone-900/[0.06] ring-1 ring-stone-900/[0.04]">
          <LobBrandHero className="h-auto w-full" priority />
        </div>

        <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link
            href="/sign-in?lob_intent=shipper"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-lob-navy px-8 text-sm font-semibold text-white shadow-md shadow-lob-navy/20 transition hover:bg-lob-navy-hover hover:shadow-lg sm:min-w-[200px]"
          >
            Sign in — Mill / supplier
          </Link>
          <Link
            href="/sign-in?lob_intent=carrier"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border-2 border-lob-navy bg-white px-8 text-sm font-semibold text-lob-navy transition hover:bg-stone-50 sm:min-w-[200px]"
          >
            Sign in — Carrier
          </Link>
        </div>
        <div className="mx-auto mt-3 flex max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link
            href="/sign-up?lob_intent=shipper"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-stone-200 bg-white/80 px-6 text-sm font-medium text-stone-700 backdrop-blur transition hover:border-stone-300 hover:bg-white sm:min-w-[180px]"
          >
            Create account — Shipper
          </Link>
          <Link
            href="/sign-up?lob_intent=carrier"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-stone-200 bg-white/80 px-6 text-sm font-medium text-stone-700 backdrop-blur transition hover:border-stone-300 hover:bg-white sm:min-w-[180px]"
          >
            Create account — Carrier
          </Link>
        </div>

        <section className="mx-auto mt-20 max-w-5xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-stone-500">
            Why {BRAND_PRODUCT_NAME}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {BRAND_VALUE_PROPS.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm shadow-stone-900/[0.04] transition hover:border-stone-300 hover:shadow-md"
              >
                <h3 className="text-base font-semibold text-lob-navy">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-3xl rounded-2xl border border-lob-gold/25 bg-gradient-to-br from-white to-lob-paper px-6 py-8 text-center shadow-sm">
          <p className="text-sm font-medium text-stone-800">
            Trusted workflow for{" "}
            <span className="font-semibold text-lob-navy">sawmills, reload centers, wholesalers</span>, and{" "}
            <span className="font-semibold text-lob-navy">asset carriers</span> moving forest products every day.
          </p>
          <p className="mt-4 text-sm text-stone-600">
            After sign-in, complete{" "}
            <Link className="font-semibold text-lob-navy underline decoration-lob-gold/40 underline-offset-2" href="/onboarding">
              account setup
            </Link>{" "}
            to link your company. Lane analytics &amp; fuel tools live in{" "}
            <Link className="font-semibold text-lob-navy underline decoration-lob-gold/40 underline-offset-2" href="/insights">
              Insights
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
