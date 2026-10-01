import { Suspense } from "react";

import { ClerkIntentBridge } from "@/components/clerk-intent-bridge";
import { SignInWithRedirect } from "@/components/clerk-sign-in-with-redirect";

export default function Page() {
  return (
    <main className="bg-lob-paper px-4 py-10">
      <Suspense fallback={null}>
        <ClerkIntentBridge />
      </Suspense>
      <div className="mx-auto w-full max-w-md">
        <Suspense fallback={<div className="p-6 text-center text-sm text-stone-500">Loading…</div>}>
          <SignInWithRedirect />
        </Suspense>
      </div>
    </main>
  );
}
