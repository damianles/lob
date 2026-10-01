import Link from "next/link";

import { CreateAccountChoice } from "@/components/create-account-choice";
import {
  BRAND_EYEBROW,
  BRAND_POSITIONING,
  BRAND_PRODUCT_NAME,
  BRAND_VALUE_PROPS,
} from "@/lib/brand-marketing";
import { signInUrlForAppPath } from "@/lib/guest-auth-routes";
import { lobWoodOutlineButtonClass } from "@/lib/lob-button-styles";

export function LandingEntry() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-lob-gold-muted">
        {BRAND_EYEBROW}
      </p>
      <h1 className="mt-3 text-center text-4xl font-semibold tracking-tight text-lob-navy sm:text-5xl sm:leading-[1.1]">
        {BRAND_POSITIONING}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-stone-600">
        Suppliers post loads. Carriers book a Firm Rate or place a bid. Company names stay hidden until
        someone commits.
      </p>

      <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            Example load
          </p>
          <p className="text-[11px] text-stone-500">Supplier name hidden</p>
        </div>
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-[1.4fr_1fr_auto] sm:items-center">
          <div>
            <p className="text-sm font-semibold text-lob-navy">Eugene, OR → Denver, CO</p>
            <p className="mt-1 text-xs text-stone-500">Pickup Tue · Flatbed · 46,000 lbs</p>
          </div>
          <p className="text-sm text-stone-700">SPF · 2x4 · kiln-dried</p>
          <p className="text-sm font-semibold text-lob-navy">Firm Rate · $2,450</p>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <CreateAccountChoice />
        <Link href={signInUrlForAppPath("/")} className={`${lobWoodOutlineButtonClass} min-h-12 px-8`}>
          Sign in
        </Link>
      </div>
      <p className="mt-4 text-center text-sm text-stone-500">
        <Link href="/capacity" className="font-semibold text-lob-navy underline decoration-lob-gold/50 underline-offset-2">
          Browse capacity
        </Link>
      </p>

      <section className="mx-auto mt-16 max-w-2xl">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-stone-500">
          Why {BRAND_PRODUCT_NAME}
        </h2>
        <div className="mt-8 space-y-8 border-t border-stone-200 pt-8">
          {BRAND_VALUE_PROPS.map((item) => (
            <article key={item.title} className="border-l-2 border-lob-gold/60 pl-5">
              <h3 className="text-lg font-semibold tracking-tight text-lob-navy">{item.title}</h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <p className="mx-auto mt-12 max-w-2xl text-center text-sm leading-relaxed text-stone-600">
        After sign-in, account setup files the company and the documents the other side reads after a booking.
      </p>
    </div>
  );
}
