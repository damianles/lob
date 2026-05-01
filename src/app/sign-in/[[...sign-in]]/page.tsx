import { Suspense } from "react";

import { ClerkIntentBridge } from "@/components/clerk-intent-bridge";
import { SignInWithRedirect } from "@/components/clerk-sign-in-with-redirect";
import { LobBrandPrimary } from "@/components/lob-brand-primary";
import { BRAND_POSITIONING, BRAND_PRODUCT_NAME } from "@/lib/brand-marketing";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-stone-100 via-white to-lob-paper px-4 py-12">
      <Suspense fallback={null}>
        <ClerkIntentBridge />
      </Suspense>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lob-gold-muted">{BRAND_PRODUCT_NAME}</p>
          <p className="mt-2 text-sm font-medium text-stone-600">{BRAND_POSITIONING}</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xl shadow-stone-900/[0.08] ring-1 ring-stone-900/[0.04]">
          <div className="border-b border-stone-100 bg-gradient-to-b from-white to-stone-50/80 px-4 pb-4 pt-5">
            <LobBrandPrimary className="mx-auto h-auto max-h-48 w-full object-contain sm:max-h-52" priority />
          </div>
          <div className="px-1 pb-4 pt-2">
            <Suspense fallback={<div className="p-6 text-center text-sm text-stone-500">Loading…</div>}>
              <SignInWithRedirect />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
