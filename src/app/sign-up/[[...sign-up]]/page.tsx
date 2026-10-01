import { Suspense } from "react";

import { ClerkIntentBridge } from "@/components/clerk-intent-bridge";
import { SignUpWithRedirect } from "@/components/clerk-sign-up-with-redirect";

export default function Page() {
  return (
    <main className="bg-lob-paper px-4 py-10">
      <Suspense fallback={null}>
        <ClerkIntentBridge />
      </Suspense>
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <Suspense fallback={<div className="p-6 text-center text-sm text-stone-500">Loading…</div>}>
          <SignUpWithRedirect />
        </Suspense>
        <p className="border-t border-stone-100 px-4 py-3 text-center text-[11px] text-stone-500">
          By continuing you will accept LOB’s{" "}
          <a href="/legal/terms" className="underline">
            Terms
          </a>
          ,{" "}
          <a href="/legal/privacy" className="underline">
            Privacy Policy
          </a>
          , and role agreement at account setup.
        </p>
      </div>
    </main>
  );
}
