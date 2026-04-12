import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

import { ClerkIntentBridge } from "@/components/clerk-intent-bridge";
import { LobBrandPrimary } from "@/components/lob-brand-primary";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <Suspense fallback={null}>
        <ClerkIntentBridge />
      </Suspense>
      <div className="w-full max-w-md">
        <LobBrandPrimary className="mb-8 h-auto w-full rounded-lg shadow-md ring-1 ring-stone-200/80" priority />
        <SignUp />
      </div>
    </main>
  );
}
